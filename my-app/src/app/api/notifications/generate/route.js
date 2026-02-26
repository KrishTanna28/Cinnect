import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth.js';
import Notification from '@/lib/models/Notification.js';
import connectDB from '@/lib/config/database.js';
import * as tmdbService from '@/lib/services/tmdb.service';

await connectDB();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/notifications/generate — generate fresh AI-powered notifications
export const POST = withAuth(async (request, { user }) => {
  try {
    // Check how many AI notifications exist in the last 6 hours to avoid spamming
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentAiCount = await Notification.countDocuments({
      recipient: user._id,
      type: 'ai_generated',
      createdAt: { $gte: sixHoursAgo }
    });

    if (recentAiCount >= 5) {
      // Already have enough recent AI notifications – skip generation
      return NextResponse.json({ success: true, generated: 0 });
    }

    // Gather trending context from TMDB
    let trendingMovies = [];
    let trendingTV = [];
    try {
      [trendingMovies, trendingTV] = await Promise.all([
        tmdbService.getTrending('movie', 'day').catch(() => []),
        tmdbService.getTrending('tv', 'day').catch(() => [])
      ]);
    } catch {
      // proceed without trending context
    }

    const trendingContext = [
      ...(trendingMovies || []).slice(0, 5).map(m => `Movie: "${m.title}" (${m.releaseDate?.split('-')[0] || ''}), rating ${m.rating || 'N/A'}/10`),
      ...(trendingTV || []).slice(0, 5).map(t => `TV: "${t.title}" (${t.releaseDate?.split('-')[0] || ''}), rating ${t.rating || 'N/A'}/10`)
    ].join('\n');

    const howMany = Math.min(3, 5 - recentAiCount);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are generating push-notification style alerts for "Cinnect", a social movie & TV discovery platform.

Here are today's trending titles:
${trendingContext || '(no trending data available — make up plausible examples based on well-known recent shows/movies)'}

Generate exactly ${howMany} short, engaging notification items. Each should feel like breaking entertainment news, a hot take, a fun fact, or an exciting update that would make a user want to tap/click.
Mix the styles: some can be about a trending title having a great episode/score, some can be fun trivia, some can be about upcoming releases, some can be buzzy opinions.

Return ONLY a JSON array of objects, each with:
- "title" (max 60 chars, punchy headline)
- "message" (max 160 chars, one enticing sentence)
- "link" (a relative URL like "/movies/{tmdbId}" or "/tv/{tmdbId}" if you know the ID from the data above, otherwise "/browse")

Example:
[{"title":"🔥 Episode just dropped!","message":"The latest episode of X has a perfect 10/10 rating — fans are losing it.","link":"/tv/12345"}]

Do not include markdown fences. Only output the JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();

    let items = [];
    try {
      items = JSON.parse(text);
    } catch {
      console.error('Failed to parse AI notification JSON:', text);
      // Fallback static notifications
      items = [
        {
          title: '🎬 Trending Now',
          message: trendingMovies?.[0]
            ? `${trendingMovies[0].title} is trending today — have you seen it?`
            : 'Check out what\'s trending on Cinnect right now!',
          link: trendingMovies?.[0] ? `/movies/${trendingMovies[0].id}` : '/browse'
        }
      ];
    }

    // Persist them
    const created = [];
    for (const item of items.slice(0, howMany)) {
      const notif = await Notification.create({
        recipient: user._id,
        type: 'ai_generated',
        title: (item.title || '🎬 New Update').slice(0, 200),
        message: (item.message || 'Something exciting is happening on Cinnect!').slice(0, 500),
        link: item.link || '/browse',
        image: ''
      });
      created.push(notif);
    }

    return NextResponse.json({
      success: true,
      generated: created.length
    });
  } catch (error) {
    console.error('Generate AI notifications error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate notifications' },
      { status: 500 }
    );
  }
});
