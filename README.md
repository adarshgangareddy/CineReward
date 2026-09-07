# CineReward

CineReward is a movie booking and rewards platform built with a React frontend and an Express/MongoDB backend. Users can browse movies, select seats, pay for tickets, leave reviews, and earn reward coins that can be used later in the booking flow.

The project also includes admin and role-based workflows for movie teams, super admins, and partner submissions.

## Features

- Movie discovery using TMDB data
- Movie ticket booking flow with seat selection
- Razorpay payment integration
- JWT-based authentication
- Google OAuth support
- Review submission and AI-based review evaluation
- Reward coin system and redemption flow
- Email and push notification reminders
- Movie team dashboard and admin dashboard
- Partner request management
- Firebase notification configuration

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express.js
- Database: MongoDB + Mongoose
- Payments: Razorpay
- AI: Groq / OpenAI-compatible API
- Notifications: Firebase Cloud Messaging, Resend / SMTP
- External data: TMDB API

## Project Structure

```bash
CineReward/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── cron/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── scratch/
├── README.md
└── .gitignore
```

## Prerequisites

Before running the app, make sure you have:

- Node.js 18+
- npm
- MongoDB Atlas connection string or local MongoDB instance
- TMDB API key
- Razorpay key pair
- Firebase project config for web push notifications
- Resend API key or SMTP credentials
- Optional: Google OAuth credentials

## Environment Setup

Copy the example environment files and fill in the required values:

```bash
cd backend
copy .env.example .env

cd ../frontend
copy .env.example .env
```

### Backend variables

The backend expects variables such as:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `TMDB_API_KEY`
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RESEND_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_BASE64` or `FIREBASE_SERVICE_ACCOUNT`
- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_PASSWORD`

See [backend/.env.example](backend/.env.example) for the full list.

### Frontend variables

The frontend expects:

- `VITE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

See [frontend/.env.example](frontend/.env.example) for the full list.

## Running Locally

Open two terminals.

### 1) Start the backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on:

- http://localhost:5000

### 2) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

- http://localhost:5173

If `VITE_API_URL` is not set, Vite may rely on its proxy settings for local API calls. In production, set it to your deployed backend URL.

## Production Notes

For deployment, use separate values for local and production environments.

- Frontend host: Vercel, Netlify, or Render
- Backend host: Render, Railway, or another Node server
- Database: MongoDB Atlas
- Payments: Razorpay live/test keys
- Push notifications: Firebase Cloud Messaging
- Email: Resend or SMTP

Recommended production settings:

- `FRONTEND_URL` = deployed frontend URL
- `VITE_API_URL` = deployed backend URL
- Firebase frontend/backend values should point to the same Firebase project
- Never commit `.env` files or Firebase service-account credentials

## Main User Flows

### User

- Sign up, login, or use Google OAuth
- View movies and show details
- Select seats and pay for tickets
- Receive booking and reminder notifications
- Submit reviews and earn reward coins

### Movie Team

- Log in with team credentials
- Review AI-scored user feedback
- Identify high-quality reviews
- Track performance and winners

### Super Admin

- Manage the platform
- Review partner requests and admin workflows
- Monitor account and payment information
- Control access and governance

## Scripts

### Backend

```bash
npm start
npm run dev
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

- If Firebase push notifications fail, verify `VITE_FIREBASE_*` values and the backend service account.
- If Razorpay fails, confirm the key IDs and secrets are correct.
- If MongoDB connection fails, check the `MONGODB_URI` and network access rules.
- If AI review evaluation is not working, verify `AI_API_KEY` and `AI_BASE_URL`.

## License

This project is currently being developed for local and deployment testing. Add an explicit license before publishing the project publicly.

## Contributing

Feel free to fork the repo and create a feature branch for your changes. Keep environment values private and test the app locally before opening a pull request.

<p align="center">
  Made with ❤️ by <b>Adarsha Vanturu Gangareddy</b>
</p>
