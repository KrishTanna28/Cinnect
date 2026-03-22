/**
 * Entertainment Notification Service
 *
 * Generates dynamic notifications from YouTube trailers and NewsAPI articles,
 * personalized to each user's interests. Runs as a background job and also
 * on-demand when users open the notification bell.
 */
import Notification from '@/lib/models/Notification.js';
import UserActivity from '@/lib/models/UserActivity.js';
import User from '@/lib/models/User.js';
import { searchVideos } from '@/lib/youtube.service.js';
import { searchNews } from '@/lib/news.service.js';
import * as tmdbService from '@/lib/services/tmdb.service.js';
import { emitNotification } from '@/lib/socketServer.js';

// Official YouTube channels to search within
const YOUTUBE_CHANNELS = [
  'Marvel Entertainment', 'Warner Bros. Pictures', 'Netflix',
  'Sony Pictures Entertainment', 'Universal Pictures', 'Disney',
  'A24', 'Lionsgate Movies', 'Paramount Pictures', 'HBO',
  'Amazon Prime Video', 'Apple TV', 'Hulu'
];

// News search query templates
const NEWS_QUERIES = [
  'new movie trailer', 'TV show premiere', 'casting announcement',
  'movie release date', 'actor interview', 'celebrity news Hollywood',
  'streaming series', 'box office', 'film festival'
];

/**
 * Build personalized search queries from user activity and preferences.
 */
async function buildUserQueries(userId) {
  const queries = { youtube: [], news: [] };

  const [activity, user] = await Promise.all([
    UserActivity.findOne({ user: userId }).lean(),
    User.findById(userId).select('watchlist preferences reviewedGenres').lean()
  ]);

  // Collect titles from recent views
  const recentTitles = (activity?.recentViews || [])
    .slice(-10)
    .map(v => v.title)
    .filter(Boolean);

  // Collect actor names
  const actorNames = (activity?.viewedActors || [])
    .slice(-5)
    .map(a => a.name)
    .filter(Boolean);

  // Favourite genres from preferences
  const genres = [
    ...(user?.preferences?.favoriteGenres || []),
    ...(user?.reviewedGenres || [])
  ].filter(Boolean);
  const uniqueGenres = [...new Set(genres)].slice(0, 5);

  // Build YouTube queries – mix of personalized + trending
  for (const title of recentTitles.slice(0, 3)) {
    queries.youtube.push(`${title} official trailer 2025 2026`);
  }
  for (const actor of actorNames.slice(0, 2)) {
    queries.youtube.push(`${actor} interview 2025 2026`);
  }
  if (queries.youtube.length < 3) {
    const randomChannel = YOUTUBE_CHANNELS[Math.floor(Math.random() * YOUTUBE_CHANNELS.length)];
    queries.youtube.push(`${randomChannel} new trailer 2025 2026`);
  }

  // Build News queries – personalized + generic
  for (const title of recentTitles.slice(0, 2)) {
    queries.news.push(title);
  }
  for (const actor of actorNames.slice(0, 2)) {
    queries.news.push(actor);
  }
  for (const genre of uniqueGenres.slice(0, 2)) {
    queries.news.push(`${genre} movie 2025`);
  }
  // Always include at least one generic query
  const randomNewsQ = NEWS_QUERIES[Math.floor(Math.random() * NEWS_QUERIES.length)];
  queries.news.push(randomNewsQ);

  return queries;
}

/**
 * Classify a YouTube video or news article into a notification type.
 */
function classifyContent(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('trailer') || text.includes('teaser')) return 'trailer';
  if (text.includes('interview') || text.includes('talks about')) return 'interview';
  if (text.includes('cast') || text.includes('casting') || text.includes('joins')) return 'casting_update';
  if (text.includes('announce') || text.includes('reveal') || text.includes('confirm')) return 'announcement';
  return 'news';
}

/**
 * Fetch YouTube videos and create notification objects (not yet saved).
 */
async function fetchYouTubeNotifications(queries) {
  const candidates = [];
  // Run up to 3 queries, pick random subset
  const selected = shuffleArray(queries).slice(0, 3);

  for (const query of selected) {
    try {
      const result = await searchVideos(query);
      for (const video of (result.items || [])) {
        candidates.push({
          type: classifyContent(video.name || ''),
          title: truncate(video.name || 'New Video', 200),
          message: truncate(`Watch: ${video.name}`, 500),
          image: video.thumbnail || '',
          link: '/browse',
          externalLink: `https://www.youtube.com/watch?v=${video.id}`,
          externalId: `yt:${video.id}`,
          source: 'YouTube',
          relatedEntity: {
            name: extractEntityName(query),
            type: '',
            tmdbId: ''
          }
        });
      }
    } catch (err) {
      console.error('[EntertainmentNotif] YouTube query failed:', query, err.message);
    }
  }

  return candidates;
}

/**
 * Fetch news articles and create notification objects (not yet saved).
 */
async function fetchNewsNotifications(queries) {
  const candidates = [];
  const selected = shuffleArray(queries).slice(0, 3);

  for (const query of selected) {
    try {
      const result = await searchNews(query);
      for (const article of (result.articles || [])) {
        const articleUrl = article.url || '';
        if (!articleUrl) continue;
        candidates.push({
          type: classifyContent(article.title || '', article.description || ''),
          title: truncate(article.title || 'Entertainment News', 200),
          message: truncate(article.description || article.title || '', 500),
          image: article.urlToImage || '',
          link: '',
          externalLink: articleUrl,
          externalId: `news:${articleUrl}`,
          source: article.source?.name || 'News',
          relatedEntity: {
            name: extractEntityName(query),
            type: '',
            tmdbId: ''
          }
        });
      }
    } catch (err) {
      console.error('[EntertainmentNotif] News query failed:', query, err.message);
    }
  }

  return candidates;
}

// Weekly cap is randomized per user between 5–10
const WEEKLY_MIN = 5;
const WEEKLY_MAX = 10;
// Minimum gap between two entertainment notifications: 12–18 hours (randomized)
const MIN_GAP_MS = 12 * 60 * 60 * 1000;
const MAX_GAP_MS = 24 * 60 * 60 * 1000;

/**
 * Generate ONE entertainment notification for a single user (if eligible).
 * Enforces a 12–18 hour random gap between notifications and a 5–10/week cap.
 * Returns the created notification doc (or empty array if skipped).
 */
export async function generateForUser(userId) {
  try {
    console.log(`[EntertainmentNotif] Attempting to generate notification for user ${userId}`);

    // ── Check if user has push notifications enabled ──
    const userPrefs = await User.findById(userId).select('preferences').lean();
    const pushEnabled = userPrefs?.preferences?.notifications?.push !== false;

    if (!pushEnabled) {
      console.log(`[EntertainmentNotif] User ${userId} has push notifications disabled, skipping`);
      return []; // Don't send any entertainment notifications if push is disabled
    }

    const entertainmentTypes = ['trailer', 'news', 'announcement', 'casting_update', 'interview'];

    // ── Check weekly cap (randomised between 5-10) ──
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Notification.countDocuments({
      recipient: userId,
      type: { $in: entertainmentTypes },
      createdAt: { $gte: oneWeekAgo }
    });

    // Derive a stable per-user weekly cap from their ID
    const idHash = userId.toString().split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const weeklyCap = WEEKLY_MIN + (idHash % (WEEKLY_MAX - WEEKLY_MIN + 1));

    if (recentCount >= weeklyCap) {
      return [];
    }

    // ── Check minimum gap since last entertainment notification ──
    const lastNotif = await Notification.findOne({
      recipient: userId,
      type: { $in: entertainmentTypes }
    }).sort({ createdAt: -1 }).select('createdAt').lean();

    if (lastNotif) {
      const elapsed = Date.now() - new Date(lastNotif.createdAt).getTime();

      // Safety check: prevent duplicate notifications within 5 minutes (race condition protection)
      const fiveMinutes = 5 * 60 * 1000;
      if (elapsed < fiveMinutes) {
        return [];
      }

      // Random required gap between 12–18 hours
      const requiredGap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
      if (elapsed < requiredGap) {
        return [];
      }
    }

    // ── Build queries & fetch candidates ──
    const queries = await buildUserQueries(userId);

    const [ytCandidates, newsCandidates] = await Promise.all([
      fetchYouTubeNotifications(queries.youtube),
      fetchNewsNotifications(queries.news)
    ]);

    let allCandidates = shuffleArray([...ytCandidates, ...newsCandidates]);

    // ── Deduplicate by externalId against DB ──
    const candidateExternalIds = allCandidates.map(c => c.externalId).filter(Boolean);
    const existingExternalIds = new Set(
      (await Notification.find({
        recipient: userId,
        externalId: { $in: candidateExternalIds }
      }).select('externalId').lean()).map(n => n.externalId)
    );
    allCandidates = allCandidates.filter(c => c.externalId && !existingExternalIds.has(c.externalId));

    // ── Deduplicate by title (normalised) to avoid near-identical entries ──
    const existingTitles = new Set(
      (await Notification.find({
        recipient: userId,
        type: { $in: entertainmentTypes },
        createdAt: { $gte: oneWeekAgo }
      }).select('title').lean()).map(n => normalizeTitle(n.title))
    );
    const seenTitles = new Set();
    allCandidates = allCandidates.filter(c => {
      const norm = normalizeTitle(c.title);
      if (existingTitles.has(norm) || seenTitles.has(norm)) return false;
      seenTitles.add(norm);
      return true;
    });

    if (allCandidates.length === 0) {
      console.log(`[EntertainmentNotif] No valid candidates found for user ${userId}`);
      return [];
    }

    // ── Pick exactly ONE random candidate ──
    const pick = allCandidates[Math.floor(Math.random() * allCandidates.length)];
    console.log(`[EntertainmentNotif] Creating ONE notification for user ${userId}: ${pick.type} - ${pick.title}`);

    try {
      const notif = await Notification.create({
        recipient: userId,
        ...pick
      });

      // Real-time delivery via Socket.IO
      emitNotification(userId, notif.toObject());

      // Update last generation timestamp
      await UserActivity.findOneAndUpdate(
        { user: userId },
        { $set: { lastNotificationGenAt: new Date() } },
        { upsert: true }
      );

      return [notif];
    } catch (err) {
      if (err.code !== 11000) {
        console.error('[EntertainmentNotif] Failed to create notification:', err.message);
      }
      return [];
    }
  } catch (err) {
    console.error('[EntertainmentNotif] generateForUser error:', err);
    return [];
  }
}

/**
 * Background job: generate notifications for all active users.
 * Called periodically from server.js scheduler.
 */
export async function generateForAllUsers() {
  try {
    // Find users who logged in within the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.find({
      isActive: true,
      lastLogin: { $gte: sevenDaysAgo }
    }).select('_id').lean();

    console.log(`[EntertainmentNotif] Generating for ${activeUsers.length} active users`);

    // Process users one at a time (each gets at most 1 notification)
    const shuffledUsers = shuffleArray(activeUsers);
    let generated = 0;
    for (const u of shuffledUsers) {
      const result = await generateForUser(u._id);
      if (result.length > 0) generated++;
      // Brief pause between users to avoid API rate limits
      await sleep(1000);
    }
    console.log(`[EntertainmentNotif] Created ${generated} notifications this cycle`);

    console.log('[EntertainmentNotif] Background generation complete');
  } catch (err) {
    console.error('[EntertainmentNotif] generateForAllUsers error:', err);
  }
}

// ── Utility functions ──

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function extractEntityName(query) {
  // Strip common suffixes used in search queries
  return query
    .replace(/\s*(official\s+)?trailer\s*\d*/gi, '')
    .replace(/\s*interview\s*\d*/gi, '')
    .replace(/\s*movie\s*\d*/gi, '')
    .replace(/\s*20\d{2}/g, '')
    .trim();
}

function normalizeTitle(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
