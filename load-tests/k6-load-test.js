import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Authentication mode:
// - Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to enable authenticated tests
// - Or run in anonymous-only mode (default)
const AUTH_ENABLED = __ENV.TEST_USER_EMAIL && __ENV.TEST_USER_PASSWORD;

// Test users - provide via environment variables
// Usage: k6 run -e TEST_USER_EMAIL=you@email.com -e TEST_USER_PASSWORD=yourpass k6-load-test.js
// For multiple users, use comma-separated values:
// k6 run -e TEST_USER_EMAIL=user1@email.com,user2@email.com -e TEST_USER_PASSWORD=pass1,pass2 k6-load-test.js
const TEST_USERS = (() => {
  if (!AUTH_ENABLED) return [];

  const emails = (__ENV.TEST_USER_EMAIL || '').split(',').filter(e => e.trim());
  const passwords = (__ENV.TEST_USER_PASSWORD || '').split(',').filter(p => p.trim());

  return emails.map((email, i) => ({
    email: email.trim(),
    password: (passwords[i] || passwords[0] || '').trim()
  })).filter(u => u.email && u.password);
})();

// Sample data for content creation
const SAMPLE_TITLES = [
  'Great movie experience',
  'Loved every minute',
  'Not what I expected',
  'A cinematic masterpiece',
  'Worth watching',
];

const SAMPLE_CONTENT = [
  'This movie really surprised me with its depth and storytelling.',
  'The acting was phenomenal and the plot kept me engaged throughout.',
  'I would definitely recommend this to anyone who enjoys this genre.',
  'The cinematography was breathtaking, every frame was like a painting.',
  'A solid entry in the franchise that fans will appreciate.',
];

const SAMPLE_COMMENTS = [
  'Great post, totally agree!',
  'Thanks for sharing this perspective.',
  'Interesting take on the subject.',
  'I had a similar experience.',
  'This is exactly what I was thinking.',
];

// ============================================================================
// CUSTOM METRICS
// ============================================================================

// Error rates by category
const authErrorRate = new Rate('auth_errors');
const apiErrorRate = new Rate('api_errors');
const contentCreationErrorRate = new Rate('content_creation_errors');

// Response time trends by endpoint category
const authResponseTime = new Trend('auth_response_time');
const movieResponseTime = new Trend('movie_response_time');
const reviewResponseTime = new Trend('review_response_time');
const postResponseTime = new Trend('post_response_time');
const userResponseTime = new Trend('user_response_time');
const communityResponseTime = new Trend('community_response_time');
const leaderboardResponseTime = new Trend('leaderboard_response_time');

// Counters
const successfulLogins = new Counter('successful_logins');
const successfulReviews = new Counter('successful_reviews');
const successfulPosts = new Counter('successful_posts');

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const options = {
  scenarios: {
    // Scenario 1: Load Test - Gradual ramp up to normal load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },   // Ramp up to 20 users
        { duration: '5m', target: 20 },   // Stay at 20 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'loadTest',
    },

    // Scenario 2: Stress Test - Push beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '3m', target: 50 },   // Stay
        { duration: '2m', target: 100 },  // Push higher
        { duration: '3m', target: 100 },  // Stay at stress level
        { duration: '2m', target: 150 },  // Maximum stress
        { duration: '3m', target: 150 },  // Stay at max
        { duration: '3m', target: 0 },    // Recovery
      ],
      gracefulRampDown: '30s',
      startTime: '20m', // Start after load test
      exec: 'stressTest',
    },

    // Scenario 3: Spike Test - Sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // Normal load
        { duration: '30s', target: 200 }, // Spike!
        { duration: '1m', target: 200 },  // Stay at spike
        { duration: '30s', target: 10 },  // Back to normal
        { duration: '2m', target: 10 },   // Recovery period
        { duration: '30s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
      startTime: '40m', // Start after stress test
      exec: 'spikeTest',
    },

    // Scenario 4: Soak Test - Extended duration for memory leaks
    soak_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
      startTime: '50m', // Start after spike test
      exec: 'soakTest',
    },
  },

  thresholds: {
    // Overall response time thresholds
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],

    // Error rate thresholds
    http_req_failed: ['rate<0.05'], // Less than 5% failure rate
    auth_errors: ['rate<0.02'],     // Less than 2% auth errors
    api_errors: ['rate<0.05'],      // Less than 5% API errors

    // Category-specific response times
    auth_response_time: ['p(95)<2000'],
    movie_response_time: ['p(95)<1500'],
    review_response_time: ['p(95)<2000'],
    post_response_time: ['p(95)<2000'],
    user_response_time: ['p(95)<1500'],
    leaderboard_response_time: ['p(95)<2000'],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function getJsonHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getJsonHeaders(), tags: { name: 'login' } }
  );

  authResponseTime.add(res.timings.duration);

  const success = check(res, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json('data.accessToken') !== undefined,
  });

  authErrorRate.add(!success);

  if (success) {
    successfulLogins.add(1);
    return {
      accessToken: res.json('data.accessToken'),
      refreshToken: res.json('data.refreshToken'),
      user: res.json('data.user'),
    };
  }
  return null;
}

function refreshToken(token) {
  const res = http.post(
    `${BASE_URL}/api/auth/refresh`,
    JSON.stringify({ refreshToken: token }),
    { headers: getJsonHeaders(), tags: { name: 'refresh_token' } }
  );

  authResponseTime.add(res.timings.duration);
  return res.status === 200 ? res.json('data.accessToken') : null;
}

// ============================================================================
// USER FLOWS
// ============================================================================

// Flow 1: Anonymous User Browsing (no auth required)
function anonymousBrowsingFlow() {
  group('Anonymous Browsing', () => {
    // Browse popular movies
    group('Browse Movies', () => {
      let res = http.get(`${BASE_URL}/api/movies/popular?page=1`, {
        tags: { name: 'popular_movies' }
      });
      movieResponseTime.add(res.timings.duration);
      check(res, { 'popular movies loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 3));

      res = http.get(`${BASE_URL}/api/movies/trending?page=1`, {
        tags: { name: 'trending_movies' }
      });
      movieResponseTime.add(res.timings.duration);
      check(res, { 'trending movies loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 3));

      // Search for a movie
      res = http.get(`${BASE_URL}/api/movies/search?query=action&page=1`, {
        tags: { name: 'search_movies' }
      });
      movieResponseTime.add(res.timings.duration);
      check(res, { 'movie search works': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });

    // View leaderboard
    group('View Leaderboard', () => {
      const res = http.get(`${BASE_URL}/api/leaderboard?limit=20`, {
        tags: { name: 'leaderboard' }
      });
      leaderboardResponseTime.add(res.timings.duration);
      check(res, { 'leaderboard loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });

    // Browse communities
    group('Browse Communities', () => {
      const res = http.get(`${BASE_URL}/api/communities?page=1&limit=10`, {
        tags: { name: 'communities_list' }
      });
      communityResponseTime.add(res.timings.duration);
      check(res, { 'communities loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 3));
    });

    // View public user profiles
    group('View Public Profiles', () => {
      const res = http.get(`${BASE_URL}/api/users?page=1&limit=10`, {
        tags: { name: 'users_list' }
      });
      userResponseTime.add(res.timings.duration);
      // This might 401 if auth required, that's ok
      check(res, { 'users endpoint responded': (r) => r.status === 200 || r.status === 401 });
      sleep(randomIntBetween(1, 2));
    });
  });
}

// Flow 2: Authenticated User Actions
function authenticatedUserFlow(authData) {
  if (!authData) return;

  const headers = getAuthHeaders(authData.accessToken);

  group('Authenticated User Actions', () => {
    // Get own profile
    group('Profile Management', () => {
      let res = http.get(`${BASE_URL}/api/users/me`, {
        headers,
        tags: { name: 'get_profile' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'profile loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));

      // Get settings
      res = http.get(`${BASE_URL}/api/users/me/settings`, {
        headers,
        tags: { name: 'get_settings' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'settings loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));

      // Get stats
      res = http.get(`${BASE_URL}/api/users/me/stats`, {
        headers,
        tags: { name: 'get_stats' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'stats loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });

    // Check watchlist and favorites
    group('Watchlist & Favorites', () => {
      let res = http.get(`${BASE_URL}/api/users/me/watchlist?page=1&limit=10`, {
        headers,
        tags: { name: 'get_watchlist' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'watchlist loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));

      res = http.get(`${BASE_URL}/api/users/me/favorites?page=1&limit=10`, {
        headers,
        tags: { name: 'get_favorites' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'favorites loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });

    // Check notifications
    group('Notifications', () => {
      const res = http.get(`${BASE_URL}/api/notifications?page=1&limit=20`, {
        headers,
        tags: { name: 'get_notifications' }
      });
      userResponseTime.add(res.timings.duration);
      check(res, { 'notifications loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });

    // Browse own reviews
    group('User Reviews', () => {
      const res = http.get(`${BASE_URL}/api/users/me/reviews?page=1&limit=10`, {
        headers,
        tags: { name: 'get_user_reviews' }
      });
      reviewResponseTime.add(res.timings.duration);
      check(res, { 'user reviews loaded': (r) => r.status === 200 });
      sleep(randomIntBetween(1, 2));
    });
  });
}

// Flow 3: Content Creation Flow
function contentCreationFlow(authData) {
  if (!authData) return;

  const headers = getAuthHeaders(authData.accessToken);

  group('Content Creation', () => {
    // Create a review (simulated - uses random movie ID)
    group('Create Review', () => {
      const reviewData = {
        mediaId: randomIntBetween(100, 10000),
        mediaType: 'movie',
        rating: randomIntBetween(1, 10),
        title: randomItem(SAMPLE_TITLES),
        content: randomItem(SAMPLE_CONTENT),
        spoiler: false,
      };

      const res = http.post(
        `${BASE_URL}/api/reviews`,
        JSON.stringify(reviewData),
        { headers, tags: { name: 'create_review' } }
      );
      reviewResponseTime.add(res.timings.duration);

      const success = check(res, {
        'review created or media not found': (r) => r.status === 201 || r.status === 404 || r.status === 400,
      });

      if (res.status === 201) {
        successfulReviews.add(1);
      }
      contentCreationErrorRate.add(res.status >= 500);
      sleep(randomIntBetween(2, 4));
    });
  });
}

// Flow 4: Social Interaction Flow
function socialInteractionFlow(authData) {
  if (!authData) return;

  const headers = getAuthHeaders(authData.accessToken);

  group('Social Interactions', () => {
    // Get communities and interact
    group('Community Interaction', () => {
      let res = http.get(`${BASE_URL}/api/communities?page=1&limit=5`, {
        headers,
        tags: { name: 'browse_communities' }
      });
      communityResponseTime.add(res.timings.duration);

      if (res.status === 200) {
        const communities = res.json('data.communities') || res.json('data') || [];
        if (communities.length > 0) {
          const community = randomItem(communities);
          const slug = community.slug || community._id;

          // View community posts
          res = http.get(`${BASE_URL}/api/communities/${slug}/posts?page=1&limit=10`, {
            headers,
            tags: { name: 'community_posts' }
          });
          postResponseTime.add(res.timings.duration);
          check(res, { 'community posts loaded': (r) => r.status === 200 });
          sleep(randomIntBetween(1, 3));

          // View post details if we got posts
          if (res.status === 200) {
            const posts = res.json('data.posts') || res.json('data') || [];
            if (posts.length > 0) {
              const post = randomItem(posts);
              res = http.get(`${BASE_URL}/api/posts/${post._id}`, {
                headers,
                tags: { name: 'post_detail' }
              });
              postResponseTime.add(res.timings.duration);
              check(res, { 'post detail loaded': (r) => r.status === 200 });
              sleep(randomIntBetween(1, 2));

              // Like the post (50% chance)
              if (Math.random() > 0.5) {
                res = http.post(
                  `${BASE_URL}/api/posts/${post._id}`,
                  JSON.stringify({ action: 'like' }),
                  { headers, tags: { name: 'like_post' } }
                );
                postResponseTime.add(res.timings.duration);
                check(res, { 'post liked': (r) => r.status === 200 });
                sleep(randomIntBetween(1, 2));
              }
            }
          }
        }
      }
      sleep(randomIntBetween(1, 3));
    });

    // View and interact with reviews
    group('Review Interaction', () => {
      let res = http.get(`${BASE_URL}/api/reviews?page=1&limit=10`, {
        tags: { name: 'browse_reviews' }
      });
      reviewResponseTime.add(res.timings.duration);

      if (res.status === 200) {
        const reviews = res.json('data.reviews') || res.json('data') || [];
        if (reviews.length > 0) {
          const review = randomItem(reviews);

          // View review detail
          res = http.get(`${BASE_URL}/api/reviews/${review._id}`, {
            tags: { name: 'review_detail' }
          });
          reviewResponseTime.add(res.timings.duration);
          check(res, { 'review detail loaded': (r) => r.status === 200 });
          sleep(randomIntBetween(1, 2));

          // Like the review (50% chance)
          if (Math.random() > 0.5) {
            res = http.post(
              `${BASE_URL}/api/reviews/${review._id}/like`,
              JSON.stringify({ action: 'like' }),
              { headers, tags: { name: 'like_review' } }
            );
            reviewResponseTime.add(res.timings.duration);
            check(res, { 'review interaction': (r) => r.status === 200 || r.status === 404 });
            sleep(randomIntBetween(1, 2));
          }
        }
      }
      sleep(randomIntBetween(1, 2));
    });
  });
}

// Flow 5: Heavy Read Operations (for stress testing)
function heavyReadFlow() {
  group('Heavy Read Operations', () => {
    // Parallel requests to simulate heavy load
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/movies/popular?page=1`, null, { tags: { name: 'batch_popular' } }],
      ['GET', `${BASE_URL}/api/movies/trending?page=1`, null, { tags: { name: 'batch_trending' } }],
      ['GET', `${BASE_URL}/api/leaderboard?limit=50`, null, { tags: { name: 'batch_leaderboard' } }],
      ['GET', `${BASE_URL}/api/communities?page=1&limit=20`, null, { tags: { name: 'batch_communities' } }],
      ['GET', `${BASE_URL}/api/reviews?page=1&limit=20`, null, { tags: { name: 'batch_reviews' } }],
    ]);

    responses.forEach((res, i) => {
      const success = check(res, {
        [`batch request ${i} ok`]: (r) => r.status === 200,
      });
      apiErrorRate.add(!success);
    });

    sleep(randomIntBetween(1, 3));
  });
}

// ============================================================================
// TEST EXECUTORS
// ============================================================================

export function loadTest() {
  // If no auth users configured, always run anonymous
  if (!AUTH_ENABLED || TEST_USERS.length === 0) {
    anonymousBrowsingFlow();
    heavyReadFlow();
    sleep(randomIntBetween(2, 5));
    return;
  }

  // 60% anonymous, 40% authenticated
  if (Math.random() < 0.6) {
    anonymousBrowsingFlow();
  } else {
    const user = randomItem(TEST_USERS);
    const authData = login(user.email, user.password);
    if (authData) {
      authenticatedUserFlow(authData);
      // 30% chance to create content
      if (Math.random() < 0.3) {
        contentCreationFlow(authData);
      }
      socialInteractionFlow(authData);
    } else {
      anonymousBrowsingFlow();
    }
  }
  sleep(randomIntBetween(2, 5));
}

export function stressTest() {
  // If no auth users configured, run heavy anonymous load
  if (!AUTH_ENABLED || TEST_USERS.length === 0) {
    anonymousBrowsingFlow();
    heavyReadFlow();
    heavyReadFlow();
    sleep(randomIntBetween(1, 3));
    return;
  }

  // More aggressive - 50% authenticated
  if (Math.random() < 0.5) {
    anonymousBrowsingFlow();
    heavyReadFlow();
  } else {
    const user = randomItem(TEST_USERS);
    const authData = login(user.email, user.password);
    if (authData) {
      authenticatedUserFlow(authData);
      contentCreationFlow(authData);
      socialInteractionFlow(authData);
    } else {
      heavyReadFlow();
    }
  }
  sleep(randomIntBetween(1, 3));
}

export function spikeTest() {
  // Quick operations during spike
  heavyReadFlow();

  // Chance of authenticated action (only if auth enabled)
  if (AUTH_ENABLED && TEST_USERS.length > 0 && Math.random() < 0.3) {
    const user = randomItem(TEST_USERS);
    const authData = login(user.email, user.password);
    if (authData) {
      authenticatedUserFlow(authData);
    }
  }
  sleep(randomIntBetween(0, 2));
}

export function soakTest() {
  // If no auth users configured, run anonymous flows
  if (!AUTH_ENABLED || TEST_USERS.length === 0) {
    anonymousBrowsingFlow();
    heavyReadFlow();
    sleep(randomIntBetween(3, 7));
    return;
  }

  // Balanced flow for extended testing
  if (Math.random() < 0.5) {
    anonymousBrowsingFlow();
  } else {
    const user = randomItem(TEST_USERS);
    const authData = login(user.email, user.password);
    if (authData) {
      authenticatedUserFlow(authData);
      if (Math.random() < 0.2) {
        contentCreationFlow(authData);
      }
      socialInteractionFlow(authData);
    } else {
      anonymousBrowsingFlow();
    }
  }
  sleep(randomIntBetween(3, 7));
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

export function setup() {
  console.log('Starting Cinnect Load Test Suite');
  console.log(`Base URL: ${BASE_URL}`);

  if (AUTH_ENABLED && TEST_USERS.length > 0) {
    console.log(`Authentication: ENABLED (${TEST_USERS.length} user(s))`);
  } else {
    console.log('Authentication: DISABLED (anonymous-only mode)');
    console.log('To enable authenticated tests, run with:');
    console.log('  k6 run -e TEST_USER_EMAIL=your@email.com -e TEST_USER_PASSWORD=yourpass k6-load-test.js');
  }

  // Verify the API is reachable
  const healthCheck = http.get(`${BASE_URL}/api/movies/popular?page=1`);
  if (healthCheck.status !== 200) {
    console.warn(`Warning: Health check returned status ${healthCheck.status}`);
  } else {
    console.log('API is reachable. Starting tests...');
  }

  return { startTime: new Date().toISOString(), authEnabled: AUTH_ENABLED };
}

export function teardown(data) {
  console.log('Load Test Suite Completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  console.log(`Auth mode: ${data.authEnabled ? 'Enabled' : 'Anonymous-only'}`);
}

// ============================================================================
// STANDALONE TEST (for quick validation)
// ============================================================================

export default function() {
  // Default function for quick validation runs
  anonymousBrowsingFlow();

  if (AUTH_ENABLED && TEST_USERS.length > 0) {
    const user = randomItem(TEST_USERS);
    const authData = login(user.email, user.password);
    if (authData) {
      authenticatedUserFlow(authData);
    }
  } else {
    heavyReadFlow();
  }

  sleep(randomIntBetween(2, 5));
}
