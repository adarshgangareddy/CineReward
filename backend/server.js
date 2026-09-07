const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('./middlewares/passport');

const app = express();
app.set('trust proxy', 1); // Trust Render's proxy to handle HTTPS correctly

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL // e.g. https://cinereward.onrender.com
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'cinereward_session_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Routes
app.get('/', (req, res) => {
  res.send('CineReward API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const ticketRoutes = require('./routes/tickets');
const reviewRoutes = require('./routes/reviews');

const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[v1.0.2] Server is running on port ${PORT}`);
  
  // Start the review reminder cron job
  require('./cron/reviewReminders');
});
