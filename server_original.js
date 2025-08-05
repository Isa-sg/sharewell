const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

// Import configuration
const { PORT, SESSION_SECRET } = require('./src/config/env');
const { initializeDatabase } = require('./src/config/database');

// Import middleware
const passport = require('./src/middleware/passport');

// Import routes
const authRoutes = require('./src/routes/auth');
const postsRoutes = require('./src/routes/posts');
const scoringRoutes = require('./src/routes/scoring');
const adminRoutes = require('./src/routes/admin');

// Import utilities
const { startNewsScheduler } = require('./src/utils/scheduler');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize database
initializeDatabase();

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/user', scoringRoutes);
app.use('/api/admin', adminRoutes);

// Legacy API endpoints for backward compatibility
app.get('/api/leaderboard', (req, res) => {
  // Redirect to new endpoint
  req.url = '/api/user/leaderboard';
  scoringRoutes(req, res);
});

// Start news scheduler
startNewsScheduler();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
