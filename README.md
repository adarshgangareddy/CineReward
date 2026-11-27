# CineReward — Cinema Discovery, Ticket Booking & AI Rewards Platform

[![Live App](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel)](https://cinereward.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-46E3B7?style=flat-square&logo=render)](https://cinereward-backend.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)

**CineReward** is a full-stack cinema discovery, live theatre seat-booking, AI-moderated review, and loyalty rewards platform. Viewers browse movies and collections through a responsive glassmorphic interface, book seats across city-specific multiplexes with Razorpay, receive printable digital M-Tickets with CineReward Coins, and earn bonus rewards for quality reviews evaluated by Groq AI. Production studios and administrators manage campaigns, custom movie releases, box-office ledgers, and partner inquiries through dedicated role-based portals.

- **Live Web App:** https://cinereward.vercel.app
- **Health Endpoint:** https://cinereward-backend.onrender.com/api/health

---

## Core Highlights

### 1. Cinema Discovery & Dynamic Glassmorphic UI
- Multi-source discovery feed combining **TMDB**, **TVMaze**, **Studio Ghibli API**, and admin-published releases with server startup cache warming (`warmHomeCache`) for instant page loads.
- Browse curated **Collections** (`/collections`, `/collection/:slug` — Marvel, DC, Studio Ghibli, Fast & Furious, Indian Blockbusters, Sci-Fi Epics), genre filters, OTT filters, web series seasons/episodes, and watchlists.
- Live backdrop engine (`AmbientBackdrop`) that adapts the full-bleed background canvas dynamically to the active hero slide or selected movie.

### 2. Interactive Seat Booking & Direct Razorpay Checkout
- Delayed post-load **Cinema City Picker** across 10 Indian cities (`Bengaluru`, `Hyderabad`, `Mumbai`, `Delhi-NCR`, `Pune`, `Chennai`, `Kolkata`, `Ahmedabad`, `Chandigarh`, `Kochi`) with geolocation detection and 10 city-accurate cinemas per city.
- Multi-tier **70-seat auditorium map** (*Classic*, *Grand*, *Majestic*), language/format selector, optional **Grab a Bite!** F&B cart, and **CineCoins** discount redemption.
- Direct **Razorpay Checkout** integration with server-side HMAC signature verification (`/api/tickets/create-order` -> `/api/tickets/verify-payment` -> `/api/tickets/book`), issuing a printable white **M-Ticket** (`WhiteTicketCard`) with booking barcode.
- Pending seat & snack selections persist across login redirects (including OAuth redirects) so unauthenticated users return straight to their exact seat checkout.

### 3. Unified 3-Role Authentication & Security
- Single unified portal (`/login`) serving **Users**, **Movie Teams**, and **Super Admins**:
  - **Users:** Email/username + **Argon2d** password, Google OAuth (Passport proxied through Vercel `/api/auth/google`), X / GitHub via **Supabase Auth**, and Phone quick sign-in.
  - **Movie Teams:** Sign in using assigned `@cinereward.com` team email and a **16-digit Secret Key** (stored via SHA-256 index digest + Argon2d hash; rotatable inside `/team/dashboard`).
  - **Super Admins:** Database-backed (`users` table) or environment-configured admin credentials with Argon2d verification.
- **8-Digit Email OTP Reset** flow via Resend / SMTP for users and movie teams.

### 4. Groq AI Review Classifier & Movie Team Portal
- Reviews and audience discussions are analyzed using **Groq (`llama-3.3-70b-versatile`)** (`reviewClassifier.js`) to generate quality scores, concise AI summaries, and filterable vibe/sentiment keywords (*comedy*, *emotional*, *best*, *serious*, etc.).
- Movie Teams inspect audience sentiment filters, reward top verified reviewers with bonus coins, manage free-ticket quotas, and rotate their 16-digit secret key.
- Automated `node-cron` background scheduler (`reviewReminders.js`) sends post-showtime email reminders to encourage verified ticket reviews.

### 5. Super Admin Control Center & Partner Workflow
- **Assign Movie Team (First Tab):** Displays all live Home and Catalog movies with category filters and search. Clicking any movie opens a glassmorphic modal pre-generating a unique `@cinereward.com` email and crypto-random **16-digit secret key**.
- **Movies & Unified Template:** Publish movies with drag-and-drop rectangular image uploaders (`GlassUploadBox` for posters, backdrops, gallery stills, and cast photos), trailers, pricing tiers, payment flags, 10 theatres, country-currency box-office budget/collections, and auto-linked team credentials.
- **Financial & Partner Management:** Country-currency box-office ledger, Razorpay/bank partner payment confirmation, and event partner inquiry portal (`/partner`, `/partner-status`) featuring interactive **Leaflet** map geolocation.

---

## System Architecture

```text
Browser (React 18 + Vite + Tailwind CSS) — hosted on Vercel
   │
   ├──► Vercel /api/* Rewrite Proxy ──► Express 5 REST API (Render)
   │                                       │
   │                                       ├── Auth & RBAC Middleware (JWT + Passport Google OAuth + Argon2d)
   │                                       ├── Movies & Cache Service (TMDB / TVMaze / Studio Ghibli / 10-Theatre Engine)
   │                                       ├── Payments & Orders (Razorpay SDK + HMAC Verification)
   │                                       ├── AI Scoring & Tagging (Groq LLaMA 3.3 70B)
   │                                       ├── Transactional Email & Cron (Resend + Nodemailer + node-cron)
   │                                       │
   │                                       ▼
   └──► Supabase Auth (X / GitHub) ──► Supabase PostgreSQL (6 Tables + Indexes + RLS + Triggers)
```

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS, Framer Motion, Lucide React, Axios, React Leaflet / Leaflet, `@supabase/supabase-js` |
| **Backend** | Node.js, Express 5, `@supabase/supabase-js`, JSON Web Tokens (`jsonwebtoken`), Passport (`passport-google-oauth20`), Express Session, `argon2` (Argon2d) |
| **Database** | Supabase PostgreSQL (`pgcrypto`, GIN/lower-case indexes, auto `updated_at` triggers, Row Level Security) |
| **External APIs** | TMDB API v3, TVMaze API, Studio Ghibli API, Razorpay Checkout & Orders API, Groq AI (`llama-3.3-70b-versatile`), Resend & SMTP |
| **Hosting & Uptime** | Vercel (Frontend + `/api` proxy), Render (Backend Web Service), Supabase (Managed Postgres & OAuth), scheduled `/api/health` keepalive |

---

## Repository Structure

```text
CineReward/
├── backend/
│   ├── config/            # Supabase client, Razorpay SDK, notification helpers
│   ├── controllers/       # Auth, movies, admin, custom movies, movie teams, tickets, reviews, partners
│   ├── cron/              # Scheduled post-showtime review reminder jobs
│   ├── middlewares/       # JWT verify, optionalAuth, requireRole / requireSelfOrRole, Passport Google
│   ├── routes/            # Express routers (/auth, /movies, /tickets, /reviews, /admin, /search, /users)
│   ├── scripts/           # seedAdmin.js & resetDatabase.js CLI maintenance scripts
│   ├── services/          # TMDB/TVMaze/Ghibli aggregator, Groq review classifier, Resend/SMTP email
│   ├── supabase/          # Idempotent PostgreSQL schema & RLS setup (schema.sql)
│   ├── utils/             # Argon2d hashing, currency formatting, Supabase row mappers
│   └── server.js          # Express app bootstrap, CORS, health checks, startup cache warmup
└── frontend/
    ├── src/
    │   ├── components/    # Navbar, Footer, MovieCard, GlassUploadBox, WhiteTicketCard, AmbientBackdrop, etc.
    │   ├── lib/           # Browser Supabase client initialization
    │   ├── pages/         # Home, Catalog, Collections, MovieDetails, SeatSelection, Login, Dashboards, Partner pages
    │   ├── routes/        # Role-based ProtectedRoute wrapper
    │   └── utils/         # Auth session helpers, client cache, team key/email generators, media & watchlist utils
    ├── vercel.json        # API reverse-proxy & SPA routing rewrites
    └── vite.config.js
```

---

## Database Schema Overview

Defined in [`backend/supabase/schema.sql`](backend/supabase/schema.sql):

1. `users` — Viewers, social-login profiles, CineCoin balances, admin accounts, and 8-digit OTP reset hashes.
2. `movie_teams` — Production team accounts, `@cinereward.com` emails, Argon2d + SHA-256 secret key digests, `assigned_movies` JSONB (GIN-indexed), and free ticket quotas.
3. `movies` — Admin-published custom movies following the unified template (banners, gallery stills, cast JSONB, pricing tiers, country currency budget/collections, 10 theatres).
4. `tickets` — Confirmed bookings, seat numbers, theatre/city/showtime metadata, F&B totals, and Razorpay payment/order IDs.
5. `reviews` — Verified and discussion comments with Groq AI quality scores, vibe tags JSONB, and winner flags.
6. `partner_requests` — Event partnership submissions, status workflow, payment codes, Razorpay confirmations, and negotiation threads.

---

## Local Development Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- A **Supabase** project (URL, Publishable/Anon key, and Service Role secret key)
- API keys for **TMDB**, **Razorpay** (test/live), **Groq**, and **Resend** (optional for email OTPs)

### 1. Initialize Supabase Schema
Open **Supabase Dashboard → SQL Editor → New Query**, paste [`backend/supabase/schema.sql`](backend/supabase/schema.sql), and click **Run**.

### 2. Configure Environment Variables
```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
cp .env.example .env
```

Fill `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `TMDB_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `AI_API_KEY`, etc.) and `frontend/.env` (`VITE_API_URL=http://localhost:5000`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### 3. Install & Seed Optional Admin
```bash
cd backend && npm install
npm run seed:admin   # Seeds Super Admin credentials into Supabase users table (Argon2d hashed)

cd ../frontend && npm install
```

### 4. Run Both Servers
```bash
# Terminal 1 — Backend API (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend && npm run dev
```

---

## API Surface Summary

- **Auth (`/api/auth`)**: `/signup`, `/login`, `/supabase`, `/google`, `/google/callback`, `/phone`, `/me`, `/forgot-password`, `/verify-reset-code`, `/reset-password`, `/db-test`
- **Discovery (`/api/movies` & `/api/search`)**: `/home`, `/catalog`, `/collections`, `/collections/:slug`, `/now-playing`, `/popular`, `/:id`, `/:id/theatres`, `/:id/season/:season`
- **Bookings (`/api/tickets`)**: `/create-order`, `/verify-payment`, `/book`, `/user/:userId`
- **Reviews (`/api/reviews`)**: `/movie/:movieId`, `/add`, `/user/:userId`
- **Admin & Movie Teams (`/api/admin`)**: `/stats`, `/users`, `/teams`, `/create-team`, `/teams/:id`, `/movies`, `/team/dashboard/:movieId`, `/team/select-winners`, `/team/award-individual`, `/team/credentials`, `/partner/*`

---

## Verification & Quality Checks

```bash
# Backend syntax verification across all modules
find backend -name "*.js" -not -path "*/node_modules/*" -print0 | xargs -0 -n1 node --check

# Frontend linting (zero warnings enforced) & production bundle build
cd frontend && npm run lint && npm run build
```

---

## Security Practices Implemented

- **Argon2d** hashing (`argon2.argon2d`) for all passwords, movie-team 16-digit secret keys, and 8-digit password-reset OTPs.
- **Row Level Security (RLS)** enabled across all 6 Supabase tables so public browser `anon` keys cannot query or mutate tables directly.
- **HMAC-SHA256** Razorpay payment signature validation before persisting bookings or awarding CineReward Coins.
- Server-enforced RBAC middleware (`authenticate`, `requireRole`, `requireSelfOrRole`) separating `user`, `movie_team`, and `super_admin` privileges.
- Vercel `/api` rewrite proxy keeping database and backend origins isolated during OAuth flows.

---

Built by **Adarsha Vanturu Gangareddy** • [GitHub Repository](https://github.com/adarshgangareddy/CineReward)
