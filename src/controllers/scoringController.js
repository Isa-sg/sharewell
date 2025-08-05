const Scoring = require('../models/Scoring');
const User = require('../models/User');
const { db } = require('../config/database');

// Get user's score and ranking
const getUserScore = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await Scoring.getUserScore(req.session.userId);
    
    if (!result) {
      // Initialize user score if doesn't exist
      await Scoring.initializeUserScore(req.session.userId);
      res.json({
        totalPoints: 0,
        currentStreak: 0,
        bestStreak: 0,
        postsCount: 0,
        rank: 1,
        totalUsers: 1
      });
    } else {
      res.json({
        totalPoints: result.total_points || 0,
        currentStreak: result.current_streak || 0,
        bestStreak: result.best_streak || 0,
        postsCount: result.actual_posts_count || 0,
        rank: result.rank || 1,
        totalUsers: result.total_users || 1
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's achievements
const getUserAchievements = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const achievements = await Scoring.getUserAchievements(req.session.userId);
    res.json({ achievements });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's point history
const getUserPointHistory = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const transactions = await Scoring.getUserPointHistory(req.session.userId);
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get leaderboard (top users)
const getLeaderboard = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const leaderboard = await Scoring.getLeaderboard(limit);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserScore,
  getUserAchievements,
  getUserPointHistory,
  getLeaderboard
};
