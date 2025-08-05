const express = require('express');
const passport = require('passport');
const { register, login, logout, linkedinCallback } = require('../controllers/authController');
const User = require('../models/User');

const router = express.Router();

// LinkedIn OAuth Routes - only if configured
router.get('/linkedin', (req, res, next) => {
  if (passport._strategy('linkedin')) {
    passport.authenticate('linkedin')(req, res, next);
  } else {
    res.status(500).json({ error: 'LinkedIn OAuth not configured' });
  }
});

router.get('/linkedin/callback', (req, res, next) => {
  if (passport._strategy('linkedin')) {
    passport.authenticate('linkedin', { failureRedirect: '/' })(req, res, next);
  } else {
    res.redirect('/');
  }
}, linkedinCallback);

// Get LinkedIn connection status
router.get('/linkedin/status', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { connected } = await User.getLinkedInStatus(req.session.userId);
    res.json({ connected });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API Routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
