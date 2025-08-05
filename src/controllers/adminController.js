const User = require('../models/User');
const Post = require('../models/Post');
const { fetchAmpNews } = require('../services/newsService');
const { db } = require('../config/database');

// Check admin authorization middleware
const requireAdmin = async (req, res, next) => {
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
    res.json({ newsPostsCount });
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
          COUNT(DISTINCT us.user_id) as value
        FROM user_scores us
        UNION ALL
        SELECT 
          'total_points_awarded' as metric,
          COALESCE(SUM(us.total_points), 0) as value
        FROM user_scores us
        UNION ALL
        SELECT 
          'total_posts' as metric,
          COUNT(*) as value
        FROM post_usage pu WHERE pu.status = 'posted'
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
        AND pu.status = 'posted'
        UNION ALL
        SELECT 
          'active_users_week' as metric,
          COUNT(DISTINCT pu.user_id) as value
        FROM post_usage pu 
        WHERE DATE(pu.posted_at) >= DATE('now', '-7 days')
        AND pu.status = 'posted'
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
        WHERE status = 'posted' 
        AND DATE(posted_at) >= DATE('now', '-30 days')
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

module.exports = {
  requireAdmin,
  syncNews,
  getNewsStatus,
  getScoringStats,
  getPostingTrends
};
