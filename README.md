# Cinnect

## 1. Project Title
Cinnect

## 2. Overview
Cinnect is a movie and TV community platform built with Next.js App Router and MongoDB. It combines content discovery (TMDB-backed), user-generated reviews, community discussions, social features, direct messaging, and real-time notifications.

### What the project does
- Serves a web application for browsing movies/TV content and related metadata.
- Provides authenticated user features: profiles, follow/block controls, watchlist/favorites/history, reviews, and community participation.
- Exposes API routes for content, social graph, messaging, notifications, moderation, and recommendations.
- Supports real-time events through Socket.IO (custom in-process socket server in development and optional external socket server in production).

### Problem it solves
- Consolidates movie discovery, social interaction, and personalized engagement into one system instead of separate tools (content lookup, discussions, reviews, and messaging).

### Key capabilities
- TMDB-based media discovery/search/detail endpoints.
- Email OTP registration flow and JWT cookie-based auth.
- Google OAuth sign-in.
- Reviews with nested replies, spoiler/adult-content signals, likes/dislikes, and ranking-oriented scoring.
- Communities with public/private membership and moderation actions.
- Direct messaging with conversation requests, read state, mute, and reactions.
- Notification generation (including scheduled entertainment notifications).
- Optional AI-assisted endpoints (Gemini + Hugging Face-backed moderation/suggestions).

## 3. Features
Based on implemented routes/models/services:

- Authentication and session management
  - Email/password registration with OTP verification.
  - Login/logout and refresh-token rotation with httpOnly cookies.
  - Google OAuth login and account linking.
- User profile and social graph
  - Profile read/update, settings, stats, activity, search.
  - Follow/unfollow, followers/following lists, follow-request handling for private accounts.
  - Block/unblock support.
- Content discovery
  - Popular/trending/top-rated/discover/search routes for movies and TV.
  - Movie/TV/actor detail fetch paths and provider lookup.
- Reviews
  - Review creation/listing/detail.
  - Like/dislike on reviews and nested replies.
  - Reply support with mention metadata.
  - Spoiler detection and adult-content moderation hooks.
- Communities and posts
  - Community create/list/search/detail/update/join/request/member workflows.
  - Post retrieval, update, delete, reactions, comments, and nested replies.
- Messaging
  - Conversation listing/creation and message retrieval.
  - Read status, unread counts, mute, message reactions, and conversation-level events.
- Notifications
  - Notification listing/action routes.
  - Real-time emits for notifications/messages/read states.
  - Background scheduled generation endpoint and server-side scheduler.
- Recommendations and ranking
  - Recommendation aggregation route using TMDB metadata + user/history signals.
  - Leaderboard endpoints and gamification/xp utilities.
- Load testing
  - k6 suite with load/stress/spike/soak scenarios in `load-tests/`.

## 4. Tech Stack
Derived from package/config files.

### Languages
- JavaScript/JSX (primary)
- TypeScript (present in workspace; mixed JS/TS usage)
- CSS (Tailwind-based)

### Frontend and app framework
- Next.js 16 (App Router)
- React 18
- Tailwind CSS 4
- shadcn/ui-style component configuration (via `components.json`)
- Radix UI primitives

### Backend and data
- Next.js route handlers (`src/app/api/**`)
- Custom Node HTTP server (`my-app/server.js`) wrapping Next.js
- MongoDB + Mongoose
- JWT (`jsonwebtoken`, `jose` in middleware path)
- Optional Upstash Redis client (fallback behavior present)

### Realtime
- Socket.IO server/client
- Optional standalone socket deployment in `my-app/socket-server/`

### Integrations
- TMDB API
- Google OAuth
- Cloudinary (media uploads)
- Nodemailer (email OTP/password reset/welcome)
- Gemini (`@google/generative-ai`, `@google/genai`)
- Hugging Face inference endpoints (moderation/spoiler-related services)
- Vercel analytics

### Tooling
- ESLint (flat config + `eslint-config-next`)
- PostCSS + Autoprefixer
- k6 for load testing

## 5. Architecture / System Design
### High-level design
- `my-app` hosts a Next.js app with App Router pages and API route handlers.
- A custom Node server (`server.js`) initializes Next and attaches Socket.IO at `/api/socketio`.
- MongoDB is the primary datastore via Mongoose models (`User`, `Review`, `Community`, `Post`, `Conversation`, `Message`, `Notification`, etc.).
- Middleware enforces public vs protected routes and validates JWT tokens.

### Runtime components
- Web UI: Server and client components under `src/app` and `src/components`.
- API layer: Route handlers under `src/app/api`.
- Services: Integrations and domain logic under `src/lib/services`.
- Auth/session: JWT generation/verification + cookie helpers.
- Realtime: Socket context on client, emit helpers on server, optional external socket relay.

### Data flow (typical authenticated request)
1. Client sends request with auth cookies.
2. Middleware validates token and annotates request headers.
3. Route handler calls `withAuth`/`withOptionalAuth` wrappers as needed.
4. Handler reads/writes MongoDB via Mongoose models.
5. Optional side effects: moderation checks, embeddings, notifications, socket emits.
6. Response uses normalized JSON shape (`success`, `data`, `message`).

### Notification flow
1. Domain action (e.g., like/message/reply) writes notification record.
2. Server emits real-time event either:
   - directly through in-process `globalThis._io`, or
   - via HTTP bridge to external socket server using internal API key.
3. Client `SocketContext` receives updates and syncs UI.

## 6. Project Structure

```text
Cinnect/
  my-app/
    src/
      app/                 # Next.js pages and API route handlers
      components/          # UI and feature components
      contexts/            # User/auth refresh/socket client providers
      lib/
        config/            # DB, cloudinary, redis, passport config
        middleware/        # API auth wrappers and guards
        models/            # Mongoose schemas
        services/          # Domain and external API services
        utils/             # Shared helpers (jwt, cookies, rate limit, responses)
    server.js              # Custom Next.js + Socket.IO server entry
    next.config.mjs        # Next config (build/image behavior)
    package.json           # App dependencies and scripts
    vercel.json            # Cron schedule config
    socket-server/         # Optional standalone Socket.IO server project
  load-tests/
    k6-load-test.js        # k6 scenario definitions and flows
    scenarios/*.json       # Scenario-only k6 configs
```

## 7. Setup & Installation
### Prerequisites
- Node.js: Not specified in codebase
- npm (package-lock is present)
- MongoDB instance
- API/service credentials for enabled integrations

### Step-by-step setup
1. Clone repository.
2. Install app dependencies:
   ```bash
   cd my-app
   npm install
   ```
3. Create and populate environment file:
   - `my-app/.env`
4. (Optional) Install and configure standalone socket server:
   ```bash
   cd socket-server
   npm install
   ```
5. Start development server (from `my-app`):
   ```bash
   npm run dev
   ```

### Environment variables
Environment keys found in code and/or `.env`.

#### Core app variables
- `MONGODB_URL` (database connection)
- `JWT_SECRET` (token signing/verification)
- `PORT` (custom server port, defaults to 3000)
- `NODE_ENV` (`development`/`production` mode behavior)
- `NEXT_PUBLIC_FRONTEND_URL` (CORS/origin links and email URL generation)

#### Auth/session variables
- `ACCESS_TOKEN_EXPIRY` (optional; default in code)
- `REFRESH_TOKEN_EXPIRY` (optional; default in code)
- `REFRESH_TOKEN_EXPIRY_REMEMBER` (optional; default in code)
- `COOKIE_DOMAIN` (optional)
- `COOKIE_SAMESITE` (optional)
- `COOKIE_SECURE` (optional)
- `CRON_SECRET` (required for cron-protected routes)
- `SCHEDULER_SECRET` (required for `/api/notifications/generate-all` internal auth)

#### OAuth variables
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL`

#### Media and content variables
- `TMDB_API_KEY`
- `TMDB_BASE_URL`
- `TMDB_IMAGE_BASE_URL`
- `NEXT_PUBLIC_YOUTUBE_API_KEY`
- `NEXT_PUBLIC_NEWS_API_KEY`

#### AI/moderation variables
- `GEMINI_API_KEY`
- `HUGGINGFACE_API_TOKEN`

#### Storage and messaging variables
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_USER`
- `EMAIL_PASSWORD`

#### Cache variables
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

#### Realtime bridge variables (for external socket server mode)
- `NEXT_PUBLIC_SOCKET_URL`
- `SOCKET_SERVER_URL`
- `SOCKET_INTERNAL_API_KEY`

#### Standalone socket server variables (`my-app/socket-server`)
- `PORT` (defaults to 3001)
- `ALLOWED_ORIGINS`
- `JWT_SECRET`
- `INTERNAL_API_KEY`

#### Variables present in `.env` but not clearly consumed in main runtime paths
- `JWT_EXPIRE` (Not specified in codebase)
- `REDIS_URL` (Not specified in codebase)
- `API_KEY` (Not specified in codebase)
- `NEXT_PUBLIC_SUPABASE_URL` (Not specified in codebase)
- `SUPABASE_SERVICE_ROLE_KEY` (Not specified in codebase)
- `SUPABASE_DB_PASSWORD` (Not specified in codebase)
- `AUTH_ENABLED` (Not specified in codebase)
- `TEST_USER_EMAIL` (used by load tests)
- `TEST_USER_PASSWORD` (used by load tests)

## 8. Running the Project
### Development mode
From `my-app`:
```bash
npm run dev
```
This runs `node server.js` (custom Next.js server + Socket.IO).

### Production build
From `my-app`:
```bash
npm run build
npm run start
```

Note: `npm run start` uses `NODE_ENV=production node server.js` in script form. Cross-platform behavior for this inline env assignment is not specified in codebase.

## 9. API Documentation
API routes are implemented under `my-app/src/app/api`.

### Response format
Most endpoints return:
```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```
or on failure:
```json
{
  "success": false,
  "message": "error text"
}
```

### Authentication
- Session tokens are stored in httpOnly cookies (`auth_token`, `refresh_token`).
- Auth can also be supplied via `Authorization: Bearer <token>` in several handlers.
- Protected routes use `withAuth` and return HTTP 401 on missing/invalid auth.

### Route groups and methods
- AI
  - `POST /api/ai-assistant`
  - `GET /api/ai-assistant/suggestions`
- Auth
  - `GET /api/auth/google`
  - `GET /api/auth/google/callback`
  - `POST /api/auth/refresh`
- Users
  - `POST /api/users/register`
  - `POST /api/users/complete-registration`
  - `POST /api/users/login`
  - `POST /api/users/logout`
  - `GET/PATCH /api/users/me`
  - `GET/PATCH /api/users/me/settings`
  - `GET /api/users/search`
  - `GET /api/users/[id]`, `GET /api/users/[id]/followers`, `GET /api/users/[id]/following`
  - Additional routes for watchlist/favorites/watched/follow-requests/blocked/stats/activity
- Movies/TV/content
  - `GET /api/movies/*` (popular, trending, top-rated, discover, search, detail, tv variants)
  - `GET /api/content/[type]/[id]/providers`
- Reviews
  - `GET/POST /api/reviews`
  - `GET /api/reviews/[reviewId]`
  - `GET /api/reviews/user/[userId]`
  - reaction/reply routes under `/api/reviews/[reviewId]/*`
- Communities and posts
  - `GET/POST /api/communities`
  - `GET/PATCH/POST/DELETE /api/communities/[slug]`
  - community member/request/update/delete subroutes
  - post routes under `/api/posts/[id]` and comment/reply subroutes
- Messages
  - `GET/POST /api/messages/conversations`
  - routes for unread count, read, mute, message-level operations
- Notifications
  - `GET/PATCH /api/notifications`
  - `POST /api/notifications/action`
  - `POST /api/notifications/generate`
  - `POST /api/notifications/generate-all` (requires scheduler secret)
- Utility/system
  - `PUT/POST /api/moderate`
  - `POST /api/spoiler-detect`
  - `GET/POST/DELETE /api/search/log`
  - `GET /api/leaderboard`, `GET /api/users/leaderboard`
  - `GET /api/cron/points`

Request/response schemas are endpoint-specific. A formal OpenAPI/Swagger specification is Not specified in codebase.

## 10. Usage Examples
### Register and verify flow
```bash
# 1) Start registration (sends OTP email)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser",
    "email":"newuser@example.com",
    "password":"strongpassword",
    "fullName":"New User"
  }'

# 2) Complete registration (route expects registrationId + otp in payload)
# Exact payload shape beyond this requirement is Not specified in codebase.
```

### Login and authenticated profile read
```bash
# Login (cookies set by server)
curl -i -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","rememberMe":true}'

# Fetch own profile using returned cookies
curl -b "auth_token=<token>; refresh_token=<token>" \
  http://localhost:3000/api/users/me
```

### Create a review
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "mediaId":"550",
    "mediaType":"movie",
    "mediaTitle":"Fight Club",
    "rating":9,
    "title":"Rewatch value is high",
    "content":"Strong performances and layered storytelling.",
    "spoiler":false
  }'
```

### Run load tests
```bash
cd load-tests
k6 run k6-load-test.js
```

## 11. Scripts / Commands
### `my-app/package.json`
- `npm run dev` - Start custom server in development (`node server.js`)
- `npm run build` - Next.js production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### `my-app/socket-server/package.json`
- `npm run dev` - Run socket server with watch mode
- `npm run start` - Start socket server

### `load-tests`
- Primary command:
  - `k6 run k6-load-test.js`
- Scenario-specific commands:
  - `k6 run --config scenarios/load-only.json k6-load-test.js`
  - `k6 run --config scenarios/stress-only.json k6-load-test.js`
  - `k6 run --config scenarios/spike-only.json k6-load-test.js`
  - `k6 run --config scenarios/soak-only.json k6-load-test.js`

## 12. Configuration
- `my-app/next.config.mjs`
  - `typescript.ignoreBuildErrors: true`
  - `images.unoptimized: true`
- `my-app/vercel.json`
  - Cron job configured for `/api/cron/points` at `0 0 * * *`
- `my-app/components.json`
  - UI alias and styling config for shadcn-style component setup
- `my-app/eslint.config.mjs`
  - Extends `next/core-web-vitals`
- `my-app/postcss.config.mjs`
  - Tailwind + autoprefixer plugins

## 13. Limitations / Known Issues
Observed from current code:

- In-memory rate limiter (`src/lib/utils/rateLimit.js`) is process-local and not distributed.
- Pending registrations are stored in memory (`src/lib/pendingRegistrations.js`); restart clears uncompleted signups.
- TypeScript build errors are ignored (`next.config.mjs`), reducing type-safety at build time.
- k6 script currently targets `/api/auth/login` and `/api/auth/refresh`, while implemented login route is `/api/users/login`; this can cause invalid test calls without script adjustments.
- Script portability for `npm run start` env assignment is not guaranteed across shells/OS without adaptation.
- Formal API schema (OpenAPI/Swagger) and explicit Node engine version are Not specified in codebase.

## 14. Contributing Guidelines
Recommended workflow:

1. Create a feature branch from `main`.
2. Make focused changes.
3. Run checks locally:
   ```bash
   cd my-app
   npm run lint
   npm run build
   ```
4. If touching API behavior, validate affected routes manually and update docs.
5. Open a pull request with:
   - change summary
   - testing evidence
   - migration/env notes (if any)

Additional repository-specific contribution policy is Not specified in codebase.

## 15. License
`my-app/package.json` declares license: `ISC`.
