const { db } = require('../config/database');

class PostUsage {
  // Track post usage
  static async track(postId, userId, status = 'used') {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO post_usage (post_id, user_id, status) VALUES (?, ?, ?)',
        [postId, userId, status],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Check if post is already marked as posted
  static async isPosted(postId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM post_usage WHERE post_id = ? AND user_id = ? AND status = ?',
        [postId, userId, 'posted'],
        (err, existing) => {
          if (err) reject(err);
          else resolve(!!existing);
        }
      );
    });
  }

  // Get user's posted posts
  static async getUserPostedPosts(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT post_id FROM post_usage WHERE user_id = ? AND status = ?',
        [userId, 'posted'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.post_id));
        }
      );
    });
  }

  // Get post count for user
  static async getUserPostCount(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM post_usage WHERE user_id = ? AND status = "posted"',
        [userId],
        (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        }
      );
    });
  }

  // Delete usage records for a post
  static async deleteByPostId(postId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM post_usage WHERE post_id = ?', [postId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = PostUsage;
