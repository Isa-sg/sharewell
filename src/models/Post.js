const { db } = require('../config/database');

class Post {
  // Get all posts
  static async getAll() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT p.id, p.title, p.content, p.image_url, p.source_url, p.created_by, p.created_at, u.username as author FROM posts p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.created_at DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Create a new post
  static async create(title, content, imageUrl, createdBy, sourceUrl = null) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO posts (title, content, image_url, created_by, source_url) VALUES (?, ?, ?, ?, ?)',
        [title, content, imageUrl, createdBy, sourceUrl],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, title, content, imageUrl, createdBy, sourceUrl });
        }
      );
    });
  }

  // Get post by ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM posts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Delete post
  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM posts WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Check if post exists by title and creator
  static async existsByTitleAndCreator(title, createdBy) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM posts WHERE title = ? AND created_by = ?',
        [title, createdBy],
        (err, post) => {
          if (err) reject(err);
          else resolve(post);
        }
      );
    });
  }

  // Save news articles as posts
  static async saveNewsAsPosts(articles) {
    if (articles.length === 0) return;
    
    try {
      // Get or create system user
      const User = require('./User');
      const systemUser = await User.createSystemUser();
      
      // Save each article as a post (avoid duplicates)
      for (const article of articles) {
        // Check if post already exists
        const existingPost = await this.existsByTitleAndCreator(article.title, systemUser.id);
        
        if (!existingPost) {
          // Create new post
          await this.create(article.title, article.content, null, systemUser.id, 'https://ampcode.com/news');
          console.log(`Created post: ${article.title}`);
        }
      }
      
      console.log('News sync completed');
      
    } catch (error) {
      console.error('Error saving news posts:', error.message);
    }
  }

  // Get news posts count
  static async getNewsPostsCount() {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM posts WHERE created_by = (SELECT id FROM users WHERE username = ? LIMIT 1)',
        ['amp_news_bot'],
        (err, result) => {
          if (err) reject(err);
          else resolve(result ? result.count : 0);
        }
      );
    });
  }
}

module.exports = Post;
