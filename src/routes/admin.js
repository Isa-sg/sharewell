const express = require('express');
const {
  requireAdmin,
  syncNews,
  getNewsStatus,
  getScoringStats,
  getPostingTrends
} = require('../controllers/adminController');

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// News management
router.post('/sync-news', syncNews);
router.get('/news-status', getNewsStatus);

// Admin dashboard stats
router.get('/scoring-stats', getScoringStats);
router.get('/posting-trends', getPostingTrends);

module.exports = router;
