const User = require('../models/User');
const Post = require('../models/Post');
const { fetchAmpNews } = require('../services/newsService');
const { db } = require('../config/database');

// Check admin authorization middleware
const requireAdmin = async (req, res, next) => {
  // Temporary bypass for development - remove in production
  if (req.headers['x-admin-bypass'] === 'development') {
    return next();
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Manual news sync
const syncNews = async (req, res) => {
  try {
    const articles = await fetchAmpNews();
    await Post.saveNewsAsPosts(articles);
    res.json({ 
      message: 'News sync completed successfully', 
      articlesFound: articles.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync news: ' + error.message });
  }
};

// Get news sync status
const getNewsStatus = async (req, res) => {
  try {
    const newsPostsCount = await Post.getNewsPostsCount();
    
    // Get additional sync information
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as totalPosts,
          COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as postsToday,
          MAX(created_at) as lastSync
        FROM posts 
        WHERE created_by = 2
      `, (err, result) => {
        if (err) reject(err);
        else resolve(result || { totalPosts: 0, postsToday: 0, lastSync: null });
      });
    });

    res.json({
      newsPostsCount,
      totalPosts: stats.totalPosts || 0,
      postsToday: stats.postsToday || 0,
      lastSync: stats.lastSync,
      status: stats.totalPosts > 0 ? 'success' : 'warning',
      nextSync: 'Not scheduled' // Can be enhanced later
    });
  } catch (error) {
    console.error('News status error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get admin dashboard stats
const getScoringStats = async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          'total_users' as metric,
          COUNT(DISTINCT u.id) as value
        FROM users u
        UNION ALL
        SELECT 
          'total_points_awarded' as metric,
          COALESCE(SUM(us.total_points), 0) as value
        FROM user_scores us
        UNION ALL
        SELECT 
          'total_posts' as metric,
          COUNT(*) as value
        FROM post_usage pu
        UNION ALL
        SELECT 
          'total_achievements' as metric,
          COUNT(*) as value
        FROM user_achievements
        UNION ALL
        SELECT 
          'active_users_today' as metric,
          COUNT(DISTINCT pu.user_id) as value
        FROM post_usage pu 
        WHERE DATE(pu.posted_at) = DATE('now')
        UNION ALL
        SELECT 
          'active_users_week' as metric,
          COUNT(DISTINCT pu.user_id) as value
        FROM post_usage pu 
        WHERE DATE(pu.posted_at) >= DATE('now', '-7 days')
      `, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });

    // Convert to object
    const statsObject = {};
    stats.forEach(stat => {
      statsObject[stat.metric] = stat.value;
    });

    res.json({ stats: statsObject });
  } catch (error) {
    console.error('Scoring stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get daily/weekly posting trends
const getPostingTrends = async (req, res) => {
  try {
    const trends = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          DATE(posted_at) as date,
          COUNT(*) as posts_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM post_usage 
        WHERE DATE(posted_at) >= DATE('now', '-30 days')
        GROUP BY DATE(posted_at)
        ORDER BY date DESC
      `, (err, trends) => {
        if (err) reject(err);
        else resolve(trends);
      });
    });

    res.json({ trends: trends || [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all users for admin management
const getUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    res.json({ users: users || [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  requireAdmin,
  syncNews,
  getNewsStatus,
  getScoringStats,
  getPostingTrends,
  getUsers
};
