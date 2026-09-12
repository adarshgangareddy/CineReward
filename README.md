# CineReward

CineReward is a movie discovery, ticket booking, review, and rewards platform. Users discover movies, select seats, pay securely, submit reviews, and earn coins. Movie teams manage review campaigns and rewards, while super admins manage teams, partners, users, and platform operations.

## Product Areas

- TMDB-powered movie discovery and search
- Movie details, seat selection, booking, and Razorpay payments
- JWT email/username authentication and Google OAuth
- Role-based access for `user`, `movie_team`, and `super_admin`
- AI-assisted review scoring and winner selection
- Reward coins and review-based rewards
- Firebase push notifications and review reminder cron jobs
- Partner and event submission, status updates, payments, and email notifications
- Super Admin team provisioning, credential editing, partner management, and metrics

## Architecture

```text
Browser (React + Vite)
        |
        | REST/JSON + Bearer JWT
        v
Express API (Node.js)
  |-- auth, role middleware, controllers
  |-- movie, ticket, review, admin, partner routes
  |-- TMDB, Razorpay, Firebase, email, AI services
        |
        v
MongoDB Atlas (Mongoose models)
```

### Request flow

1. The frontend calls the Express API with Axios.
2. The API validates input and verifies JWTs in `backend/middlewares/auth.js`.
3. `requireRole()` protects admin and movie-team operations.
4. Controllers read and mutate MongoDB through Mongoose models.
5. External services handle movies, payments, AI scoring, email, and push delivery.

## Tech Stack

### Frontend

- React 18, Vite, React Router 6
- Tailwind CSS, Framer Motion, Lucide React
- Axios
- Firebase Cloud Messaging web client
- React Leaflet for partner location selection

### Backend

- Node.js and Express
- Mongoose and MongoDB Atlas
- Passport Google OAuth 2.0
- JWT and bcryptjs
- Razorpay
- Firebase Admin SDK
- Resend/SMTP email delivery
- Groq/OpenAI-compatible AI service
- Node cron jobs

## Repository Layout

```text
backend/
  config/          Firebase, Razorpay, notifications
  controllers/     Auth, movies, tickets, reviews, admin, partners
  cron/            Scheduled review reminders
  middlewares/     JWT authentication and role authorization
  models/          Mongoose schemas
  routes/          Express route modules
  services/        AI, email, TMDB, notification services
  server.js        Application bootstrap and database connection

frontend/
  public/          Firebase messaging service worker
  src/components/  Navbar, footer, search, loading, notification UI
  src/pages/       User, team, admin, booking, partner, auth screens
  src/routes/      Protected route handling
  src/App.jsx      Router, Axios auth headers, notification listener
```

## Roles and Access

| Role          | Login                                                  | Main access                                             |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `user`        | Email or username + password                           | Movies, bookings, reviews, rewards, profile             |
| `movie_team`  | Team email + password + team secret key                | Assigned movie reviews, AI winners, tickets, rewards    |
| `super_admin` | Admin email/username + password + 16-digit secret code | Teams, users, partner leads, payments, platform metrics |

All roles use the same frontend login page at `/login`. The API identifies the role and the frontend redirects to the correct workspace. Role checks must remain on the backend; hiding a link in the UI is not authorization.

## Local Setup

Requirements:

- Node.js 18 or newer
- npm
- MongoDB Atlas or local MongoDB
- Provider credentials listed below

Install dependencies:

```powershell
cd backend
npm install

cd ../frontend
npm install
```

Create environment files:

```powershell
cd backend
Copy-Item .env.example .env

cd ../frontend
Copy-Item .env.example .env
```

Start the API:

```powershell
cd backend
npm start
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Default URLs:

- Frontend: the Vite URL shown in the terminal, normally `http://localhost:3000`
- Backend: `http://localhost:5000`

## Environment Variables

Backend values are documented in [backend/.env.example](backend/.env.example). Important groups:

- Database: `MONGODB_URI`
- Auth: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Super admin: `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_SECRET_CODE`
- Movies and AI: `TMDB_API_KEY`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`
- Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Notifications: Firebase service account values, `RESEND_API_KEY`, or SMTP values
- Frontend callback: `FRONTEND_URL`

The super-admin secret code must contain exactly 16 digits. Movie-team credentials are created and edited from the Super Admin dashboard; team passwords are stored hashed.

Frontend values are documented in [frontend/.env.example](frontend/.env.example), including `VITE_API_URL` and Firebase web configuration.

## API Surface

### Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Movie and booking features

- `/api/movies`
- `/api/search`
- `/api/tickets`
- `/api/reviews`

### Super admin and movie team

- `GET /api/admin/stats` - super admin
- `GET /api/admin/users` - super admin
- `GET /api/admin/teams` - super admin
- `POST /api/admin/create-team` - super admin
- `PATCH /api/admin/teams/:id` - super admin edit team
- `/api/admin/team/*` - assigned movie team or super admin
- `/api/admin/partner/*` - public submission plus protected management routes

## Security Policies

- Never commit `.env`, service-account JSON, private keys, API keys, or payment secrets.
- Rotate any credential pasted into chat, screenshots, GitHub, logs, or a public repository.
- Use separate credentials for development and production.
- Use HTTPS for production frontend, API, OAuth callbacks, and Firebase messaging.
- Restrict MongoDB Atlas Network Access to deployment IPs where possible.
- Use least-privilege MongoDB users and enable Atlas backups.
- Keep JWT secrets long, random, and private.
- Passwords must be hashed with bcrypt; never log passwords or secret keys.
- Validate authorization on every protected backend route.
- Do not trust role values supplied by the browser.
- Use Razorpay signature verification before marking a payment complete.
- Do not expose Firebase Admin credentials in frontend code.
- Review notification and email payloads for personal data before sending.

## Deployment Plan

Recommended fast, always-available setup:

1. MongoDB Atlas with backups enabled.
2. Render paid Web Service or Railway paid service for the backend. Use an always-on plan and `npm start`.
3. Vercel, Netlify, or Render Static Site for the frontend.
4. GitHub-connected automatic deployments from a production branch.
5. Health checks against `GET /` and provider error alerts.

Production settings:

```env
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.example
VITE_API_URL=https://your-api-domain.example
```

Google OAuth production settings:

```text
Authorized origin: https://your-frontend-domain.example
Redirect URI: https://your-api-domain.example/api/auth/google/callback
```

Firebase web push requires HTTPS and the service worker at `/firebase-messaging-sw.js`. Add all environment variables in the hosting provider secret manager, not in the repository.

## Quality Checks

```powershell
cd frontend
npm run lint
npm run build

cd ../backend
node --check server.js
```

Before release, test user authentication, Google OAuth, password reset, movie-team login, assigned movie restrictions, admin login, team create/edit, booking payments, Firebase notifications, and MongoDB outage responses.

## Troubleshooting

- MongoDB errors: check `MONGODB_URI`, Atlas credentials, and Network Access.
- Google OAuth errors: check callback URL, frontend URL, client ID, and client secret.
- Admin login errors: verify all four `SUPER_ADMIN_*` values and restart the backend.
- Team login errors: use the team email, password, and current secret key from the admin dashboard.
- Missing notifications: verify Firebase web variables, VAPID key, HTTPS, and the service worker.
- Payment errors: verify Razorpay test/live keys and signature configuration.

## License and Contributions

This project is under active development. Add an explicit open-source license before public distribution. Keep pull requests focused, do not include secrets, and run frontend lint/build checks before review.

---

Made with care for movie communities by Adarsha Vanturu Gangareddy.
