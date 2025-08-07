const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../linkedin_distributor.db');

class DatabasePool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.pool = [];
    this.activeConnections = 0;
    this.waitingQueue = [];
  }

  async getConnection() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }

    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return new sqlite3.Database(DB_PATH);
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  releaseConnection(connection) {
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift();
      resolve(connection);
    } else {
      this.pool.push(connection);
    }
  }

  async close() {
    const allConnections = [...this.pool];
    this.pool = [];
    
    for (const conn of allConnections) {
      await new Promise((resolve) => conn.close(resolve));
    }
    this.activeConnections = 0;
  }
}

// Create pool instance
const dbPool = new DatabasePool();

// Main database connection
const db = new sqlite3.Database(DB_PATH);

// Wrapper for pooled queries
const pooledQuery = {
  async run(sql, params = []) {
    const conn = await dbPool.getConnection();
    return new Promise((resolve, reject) => {
      conn.run(sql, params, function(err) {
        dbPool.releaseConnection(conn);
        if (err) reject(err);
        else resolve(this);
      });
    });
  },

  async get(sql, params = []) {
    const conn = await dbPool.getConnection();
    return new Promise((resolve, reject) => {
      conn.get(sql, params, (err, row) => {
        dbPool.releaseConnection(conn);
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async all(sql, params = []) {
    const conn = await dbPool.getConnection();
    return new Promise((resolve, reject) => {
      conn.all(sql, params, (err, rows) => {
        dbPool.releaseConnection(conn);
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize database tables
const initializeDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      linkedin_access_token TEXT,
      linkedin_profile_id TEXT,
      linkedin_profile_url TEXT,
      linkedin_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Posts table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      source_url TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`);
    
    // Add source_url column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE posts ADD COLUMN source_url TEXT`, (err) => {
      // Ignore error if column already exists
    });

    // Post usage tracking
    db.run(`CREATE TABLE IF NOT EXISTS post_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      user_id INTEGER,
      status TEXT DEFAULT 'used',
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // User scoring system
    db.run(`CREATE TABLE IF NOT EXISTS user_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      total_points INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_post_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Point transactions (for detailed tracking)
    db.run(`CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      points INTEGER,
      reason TEXT,
      post_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (post_id) REFERENCES posts (id)
    )`);

    // User achievements/badges
    db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      achievement_type TEXT,
      achievement_name TEXT,
      achievement_description TEXT,
      points_awarded INTEGER DEFAULT 0,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Password reset tokens
    db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
};

module.exports = { db, pooledQuery, dbPool, initializeDatabase };
