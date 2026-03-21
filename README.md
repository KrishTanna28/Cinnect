# Cinnect

Cinnect is a full-stack movie and TV community app built around discovery, discussion, and personalized recommendations. It combines title browsing, user reviews, communities, direct messaging, and an AI assistant in one product instead of splitting those workflows across separate tools.

## Overview

The app helps users find what to watch, track what they care about, and discuss it with other people. Users can browse movies and shows, save titles to a watchlist or favorites, write reviews, join communities, follow other users, and ask the built-in assistant for recommendations or platform guidance.

## Features

- Browse and search movies, TV shows, and cast data with detailed pages for trailers, news, and watch-provider availability.
- Write rated reviews, like or dislike reviews, and continue discussions through threaded replies.
- Create and manage communities with public or private membership, posts, comments, image uploads, and video uploads.
- Maintain a watchlist and favorites list, with public profiles, follow relationships, and private-account follow requests.
- Use direct messaging with real-time updates, typing indicators, and request-style inbox behavior for private accounts.
- Get personalized recommendations based on favorites, watchlist activity, review history, search history, and community signals.
- Ask C.A.S.T, the built-in AI assistant, for recommendations, explanations, and Cinnect-specific guidance.
- Search community content semantically using embeddings stored on reviews and posts.
- Earn progression, badges, and leaderboard placement through a ranking system that rewards quality, engagement, and consistency.
- Filter or flag unsafe content with spoiler handling, age gating, and moderation for text, images, and video.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | Next.js 16 (App Router) |
| Frontend | React 18, JavaScript/JSX |
| Styling | Tailwind CSS 4, Radix UI, shadcn/ui |
| Server | Custom Node.js server for Next.js + Socket.IO |
| Database | MongoDB with Mongoose |
| Semantic search | MongoDB Atlas Vector Search |
| Authentication | JWT, Google OAuth 2.0 via Passport |
| AI | Google Gemini (`@google/genai`, `@google/generative-ai`) |
| Moderation | Hugging Face inference APIs |
| Realtime | Socket.IO |
| Media storage | Cloudinary, Multer |
| Forms and validation | React Hook Form, Zod |
| External APIs | TMDB, YouTube Data API, News API |
| Email | Nodemailer |

## Architecture / Key Concepts

- `my-app/` contains the main Next.js application. The root `README.md` documents the whole project, but development happens inside that app directory.
- A custom `server.js` boots Next.js and attaches Socket.IO so notifications and messaging can share the same HTTP server.
- C.A.S.T is not a plain chat box. The assistant route classifies intent, builds context, runs a Gemini tool loop, and applies spoiler and content-safety checks before returning a response.
- Reviews and community posts store embeddings. Those vectors are queried through MongoDB Atlas Vector Search to support semantic retrieval and assistant context.
- Recommendations are generated with a weighted scoring model that blends user signals with TMDB metadata such as genre, language, cast, directors, popularity, and trending status.
- Leaderboard ranking is based on computed quality, engagement, and consistency scores instead of raw activity counts alone.
- Media moderation is multi-stage: text, images, and video frames are checked separately, and adult-content flags can also drive age-gated access.

## Setup Instructions

### Prerequisites

- Node.js LTS
- MongoDB database
- MongoDB Atlas Vector Search if you want semantic search and assistant context retrieval
- API credentials for TMDB, Google Gemini, Google OAuth, Cloudinary, News API, YouTube Data API, and Hugging Face

### Install

```bash
git clone <repository-url>
cd Cinnect/my-app
npm install
```

### Environment Variables

Create `my-app/.env` and provide the values the app reads at runtime:

```env
MONGODB_URL=
PORT=3000
NODE_ENV=development

JWT_SECRET=
JWT_EXPIRE=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:3000/api/auth/google/callback

NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:3000

GEMINI_API_KEY=
HUGGINGFACE_API_TOKEN=
TMDB_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_USER=
EMAIL_PASSWORD=

NEXT_PUBLIC_NEWS_API_KEY=
NEXT_PUBLIC_YOUTUBE_API_KEY=

SCHEDULER_SECRET=
CRON_SECRET=
```

### Vector Search Indexes

If you want semantic search and community-aware assistant responses, create Atlas Vector Search indexes for:

- `reviews.embedding` with index name `review_embedding_index`
- `posts.embedding` with index name `post_embedding_index`

### Run the App

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

### Optional: Backfill Existing Embeddings

If the database already contains reviews or posts created before embeddings were added, run:

```bash
node src/scripts/backfill-embeddings.mjs
```

## Usage

1. Sign up with email OTP verification or Google OAuth.
2. Browse or search for a movie or show, then open its detail page.
3. Add titles to your watchlist or favorites, or write a review with a rating.
4. Join a community, create posts, and interact with other users through comments or messages.
5. Open C.A.S.T to ask for recommendations, title explanations, or help navigating platform features.
6. Track progress through profile stats, badges, and leaderboard rank.

## Future Improvements

- Move scheduled notification generation into a dedicated worker or job system instead of running it inside the web server process.
- Add an `.env.example` and scripted setup for vector indexes and embedding backfills to reduce first-run friction.
- Expand automated test coverage around recommendation scoring, moderation flows, and realtime messaging.
