# NeoTunes - "The Future Sounds Better" 🎧

NeoTunes is a premium, production-ready hybrid music streaming platform combining the library completeness of YouTube, the metadata depth of Spotify, and the personal locker upload utility of SoundCloud into a unified, high-performance web experience.

This application is built as a single, consolidated **Next.js 15 (App Router)** and **React 19** codebase, leveraging **Supabase** for Auth, Storage, and PostgreSQL relational data, and **Upstash Redis** for caching and rate limiting.

---

## 🏗️ Architecture

NeoTunes utilizes a high-efficiency server-client hybrid architecture:
1. **Spotify Web API**: Used *server-side only* for global music metadata (artists, albums, genres, popularity) and seed signals for recommendations. Audio is *never* streamed from Spotify.
2. **YouTube Data API v3**: Resolves Spotify metadata queries dynamically to corresponding YouTube video streams on-demand (cached indefinitely in Redis).
3. **Official YouTube IFrame Player API**: Embedded invisibly to coordinate and synchronize playback (play, pause, seek, volume, autoplay) in the client.
4. **Supabase Auth & Storage**: Handles email/password, magic link, and Google OAuth sessions, with a secure private storage bucket (`cloud_songs`) to host user cloud uploads.
5. **Supabase PostgreSQL**: Hosts profile and preference sync triggers, playlist records, play history logging, liked songs, and GIN/trigram indexes for fuzzy local database autocomplete.
6. **Upstash Redis**: Caches hybrid search outputs and resolved YouTube video IDs to protect APIs from quota limits.

---

## 📁 Repository Directory Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI Build & Test pipeline
├── supabase/
│   └── setup.sql                # PostgreSQL Tables, Triggers, GIN Trigram Indexes, and RLS Policies
├── scripts/
│   └── db-init.js               # Database schema initialization runner
├── src/
│   ├── app/                     # Next.js App Router Page directories
│   │   ├── api/                 # Next.js API Route Handlers (Search, Playlists, Liked, History, Cloud)
│   │   ├── auth/                # Sign In / Sign Up and OAuth views
│   │   ├── home/                # User dashboard and recommendation listings
│   │   ├── library/             # Tabbed Locker (Playlists, Liked, History, Cloud Uploads)
│   │   ├── player/              # Fullscreen glassmorphic OLED Player & spectrum visualizer
│   │   └── page.tsx             # Marketing landing page
│   ├── components/              # UI widgets (MiniPlayer, AppLayout sidebar, YouTubePlayer iframe)
│   ├── hooks/                   # Custom react hooks
│   ├── lib/                     # Client/Server DB singletons and Supabase context splits
│   ├── providers/               # Theme and TanStack React Query wrappers
│   ├── store/                   # Zustand global playback coordination state
│   └── types/                   # TypeScript interfaces
├── vitest.config.ts             # Vitest test configurations
└── docker-compose.yml           # Local dev Postgres and Redis container definitions
```

---

## 🚀 Setup & Local Execution Guide

### 1. Initialize Infrastructure
To spin up a local PostgreSQL and Redis server, run:
```bash
docker-compose up -d
```

### 2. Configure Environment Variables
Create a `.env.local` file at the root of the project with the following keys filled:
```env
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role

YOUTUBE_API_KEY=your_youtube_data_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Initialize Database Migrations
Deploy tables, custom triggers (for auth-profile syncing), indexes, and Row Level Security rules by running:
```bash
npm run db:init
# (Or manually: node scripts/db-init.js)
```

### 4. Start Development Server
Install packages and boot Next.js:
```bash
npm install --legacy-peer-deps
npm run dev
```

---

## 🧪 Testing

We use **Vitest** for server-side search ranking logic checks:
```bash
# Run unit tests once
npx vitest run

# Run in watch mode
npx vitest
```

---

## 🌐 API Routes Documentation

### Unified Search Engine
* `GET /api/search?q={query}` - Returns merged, deduplicated search results from local tables and Spotify, ranked using pg_trgm and cached in Upstash Redis.
* `GET /api/spotify/search?q={query}` - Proxy searching Spotify Web API.
* `GET /api/youtube/search?title={title}&artist={artist}` - Resolves a track metadata to a streamable YouTube Video ID (cached indefinitely).

### Personalization & Social
* `GET /api/recommendations?type=discover-weekly` - Fetches personalized tracks seeded by user liked songs or listening history.
* `GET /api/user/stats` - Compiles profile stats (total plays, likes, favorite genre, and top 5 tracks).
* `GET /api/history` - Fetches listening history.
* `POST /api/history` - Logs a play event.

### Library CRUD
* `GET /api/liked` - Lists all liked songs.
* `POST /api/liked` - Likes a track (dynamically cascading insertions to artists, albums, and tracks tables).
* `DELETE /api/liked` - Unlikes a track.
* `GET /api/playlists` - Lists playlists.
* `POST /api/playlists` - Creates a new playlist.
* `GET /api/playlists/[id]` - Fetches a specific playlist's details and tracks.
* `PATCH /api/playlists/[id]` - Multi-action (add track, remove track, reorder positions, or update details).
* `DELETE /api/playlists/[id]` - Deletes playlist.

### Cloud MP3 Locker
* `GET /api/cloud` - Lists user uploaded tracks.
* `POST /api/cloud` - Logs a new storage upload reference in tracks/sources.
* `GET /api/cloud/resolve?filePath={path}` - Generates a secure temporary signed URL from Supabase Storage to stream user uploads privately.
