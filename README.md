# Cinnect

Cinnect is a social movie and TV discovery platform where users can explore content, write and discuss reviews, build communities around shared interests, and track everything they watch. It goes beyond simple browsing by combining community-driven discussions, a gamification layer, an AI-powered assistant, and real-time notifications into a single cohesive experience.

Built as a full-stack application with Next.js, MongoDB, and Google Gemini AI.

---

## What You Can Do on Cinnect

### Discover Movies and TV Shows

The homepage presents a rich, curated browsing experience with over 30 content carousels spanning trending titles, top-rated picks, genre-specific selections (action, horror, sci-fi, romance, anime, and more), critically acclaimed films, hidden gems, binge-worthy TV shows, and new releases. A featured content carousel highlights what is trending right now.

The dedicated Browse page provides advanced filtering so users can narrow down content by type (movies or TV shows), language (13+ supported including English, Hindi, Korean, Japanese, Spanish, French, and others), minimum rating, genre, and sort order (by popularity, rating, title, or release year). Results load continuously through infinite scroll.

### Detailed Movie and TV Pages

Every movie and TV show has a full detail page that includes the synopsis, ratings, cast information, trailers and video clips (embedded from YouTube), and a curated news section about that specific title. TV shows include full season-by-season breakdowns with episode details.

Most importantly, each detail page shows **where you can actually watch** the content. Streaming availability is displayed by region, showing which services (Netflix, Prime Video, Disney+, etc.) currently offer the title, with direct links to start watching. Subscription services are prioritized over rental or purchase options.

Users can add titles to their watchlist, mark them as favorites, share them, or jump straight into writing a review -- all from the same page.

### Reviews and Ratings

Users can write reviews with star ratings (1-10) on any movie or TV show. Reviews support likes and dislikes from other users, and the community can engage in threaded reply chains under any review. This turns reviews into actual discussions rather than one-way opinions.

All reviews go through an **AI-powered moderation system** before being published. The system checks for spam, offensive content, duplicates, and overall quality using a combination of rule-based filters and Google Gemini analysis. This keeps the review ecosystem clean without requiring constant manual moderation.

### Communities

Communities are where Cinnect becomes more than a movie database. Users can create or join topic-based communities tied to specific movies, TV shows, actors, or general entertainment topics. Each community has its own feed, description, rules, and membership management.

Within a community, members can create posts with text, images, and video attachments. Posts support voting, comments, and nested replies. The feed can be sorted by most recent, most popular, or trending. Community creators can manage membership, approve join requests for private communities, set community rules, and customize the community page with banners and descriptions.

A global community feed aggregates posts across all communities, filterable by category (general, movies, TV shows, actors) to help users discover active discussions.

### AI Assistant -- C.A.S.T

C.A.S.T (the built-in AI assistant) is accessible from anywhere on the platform as a floating chat widget. Users can ask it for movie recommendations, questions about actors, plot details, or general entertainment trivia.

What makes it more than a generic chatbot is that it uses **Retrieval-Augmented Generation (RAG)**. When you ask a question, C.A.S.T searches through actual reviews and community discussions on Cinnect using semantic vector search, then uses that real community context to generate informed responses. It is not just pulling from a pre-trained model -- it is referencing what your community has actually said.

The assistant also generates daily conversation starters that are refreshed and cached locally, giving users a reason to interact with it regularly.

### Semantic Search

Search on Cinnect works at two levels. Standard keyword search covers movies, TV shows, celebrities, communities, posts, and users -- all from a single search bar with live results grouped by category.

Beyond that, the platform supports **semantic search** powered by vector embeddings. When reviews and posts are created, their content is automatically converted into vector embeddings using Google Gemini. This means searching for something like "movies about loneliness" will surface relevant reviews and discussions even if they never use the word "loneliness." It matches on meaning, not just keywords.

### Watchlist and Favorites

Users can maintain a personal watchlist and a separate favorites list. Both are accessible from the user's profile and show enriched details including posters, ratings, genres, and the date each item was added. Items can be removed or shared at any time.

### Gamification -- Points, Achievements, and Leaderboard

Every meaningful action on the platform earns points: writing reviews, creating posts, commenting, participating in communities, and maintaining daily activity streaks. Points accumulate into levels, and users can unlock achievement badges by hitting specific milestones:

- **Critic** -- Write 10 reviews
- **Cinephile** -- Write 50 reviews
- **Social Butterfly** -- Follow 5+ users
- **Community Leader** -- Receive 100+ likes on reviews
- **Marathon Runner** -- Add 20+ items to watchlist
- **Legendary** -- Reach 5,000 points

A public leaderboard ranks the top 20 users by points, with medal distinctions for the top three. Each user's profile also displays their point total and badge count.

### User Profiles and Social Features

Every user has a public profile showing their avatar, bio, stats (points, reviews written, followers, following, watchlist size), and tabbed sections for their watchlist, favorites, and review history. Users can follow each other, and follower/following lists are viewable through a modal on any profile.

Profile settings allow users to update their name, bio, avatar, and select their favorite genres from 18 options. Privacy controls include toggling account visibility between public and private, and managing follow requests.

### Real-Time Notifications

Notifications are delivered in real-time via Socket.io. Users receive alerts for follows, community activity, and entertainment news updates (trailers, casting announcements, interviews). The notification bell shows an unread count badge, and all notifications can be marked as read in bulk.

### Personalized Recommendations

A dedicated recommendations page presents content carousels tailored to different tastes -- sci-fi, thrillers, dramas, action, trending titles, and critically acclaimed picks. Each carousel is scrollable and links directly to the full detail page for any title.

### Entertainment News

Relevant entertainment news is integrated throughout the platform. News carousels appear on individual movie/TV detail pages (showing articles about that specific title) and on community pages (showing news relevant to the community's focus). Articles include thumbnails, headlines, source attribution, and links to the full external article.

### Spam Prevention

Beyond AI moderation on reviews, the platform includes a broader spam prevention layer with rate limiting, copy-paste detection, rapid-fire submission blocking, spam score tracking, and duplicate content detection. This runs across reviews, posts, and comments to maintain content quality platform-wide.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript / JSX |
| Database | MongoDB with Mongoose, Atlas Vector Search |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI |
| Authentication | JWT + Google OAuth 2.0 (Passport.js) |
| AI | Google Gemini (chatbot, RAG, moderation, embeddings) |
| Real-Time | Socket.io |
| File Storage | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| External Data | TMDB, YouTube Data API, News API |
| Validation | Zod, react-hook-form |
| Charts | Recharts |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas instance (with Vector Search enabled for semantic search features)
- API keys: TMDB, Google Cloud (OAuth + Gemini), Cloudinary, News API, YouTube Data API

### Setup

1. Clone the repository and install dependencies:
   ```sh
   git clone <repository-url>
   cd Cinnect/my-app
   npm install
   ```

2. Create a `.env` file in the project root (see [Configuration](#configuration) below).

3. Set up MongoDB Atlas Vector Search indexes:
   - `review_embedding_index` on the `reviews` collection, field `embedding`, 768 dimensions, cosine similarity
   - `post_embedding_index` on the `posts` collection, field `embedding`, 768 dimensions, cosine similarity

4. Start the development server:
   ```sh
   npm run dev
   ```
   The app runs at `http://localhost:3000`.

### Production Build

```sh
npm run build
npm start
```

### Backfilling Embeddings

If you have existing content from before the semantic search feature was added, run the backfill script to generate embeddings for existing reviews and posts:

```sh
npm run backfill-embeddings
```

---

## Configuration

Create a `.env` file in the project root:

```
# Database
MONGODB_URL=

# Authentication
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=

# Application URLs
NEXT_PUBLIC_FRONTEND_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_API_URL=

# Google Gemini AI
GEMINI_API_KEY=

# TMDB
TMDB_API_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Gmail SMTP)
EMAIL_USER=
EMAIL_PASSWORD=

# News API
NEXT_PUBLIC_NEWS_API_KEY=

# YouTube Data API
NEXT_PUBLIC_YOUTUBE_API_KEY=
```

---

## API Routes

The application exposes REST API routes under `/api/` covering authentication (Google OAuth, JWT refresh), user management (registration with OTP verification, login, profiles, watchlist, favorites, leaderboard), movie and TV data (search, discover, details, streaming providers), reviews (CRUD, likes, replies), communities (CRUD, membership, moderation, posts), and the AI assistant (chat, daily suggestions).

---

## Project Structure

```
my-app/src/
  app/              Pages and API routes (Next.js App Router)
  components/       UI components (navigation, detail pages, AI assistant, community feeds)
  contexts/         Auth and user context providers
  hooks/            Custom hooks (toast notifications, infinite scroll)
  lib/
    config/         Database, Cloudinary, Passport configuration
    middleware/     Auth, validation, points, spam prevention, file uploads
    models/         Mongoose schemas (User, Review, Community, Post)
    services/       TMDB, embeddings, RAG, moderation, news, YouTube
    utils/          Helpers and points calculator
  scripts/          Maintenance scripts (embedding backfill)
```
