const express = require('express');
const {
  getUserScore,
  getUserAchievements,
  getUserPointHistory,
  getLeaderboard
} = require('../controllers/scoringController');

const router = express.Router();

// User scoring endpoints
router.get('/score', getUserScore);
router.get('/achievements', getUserAchievements);
router.get('/point-history', getUserPointHistory);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

module.exports = router;
