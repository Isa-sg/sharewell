const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  // Create a new user
  static async create(username, password, email) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hashedPassword, email],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, username, email });
        }
      );
    });
  }

  // Find user by username
  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, user) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, user) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });
  }

  // Find user by ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, user) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });
  }

  // Find user by LinkedIn profile ID
  static async findByLinkedInId(linkedinProfileId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE linkedin_profile_id = ?',
        [linkedinProfileId],
        (err, user) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });
  }

  // Update LinkedIn token
  static async updateLinkedInToken(userId, accessToken, expiresAt) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET linkedin_access_token = ?, linkedin_expires_at = ? WHERE id = ?',
        [accessToken, expiresAt, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Create user from LinkedIn profile
  static async createFromLinkedIn(profile, accessToken) {
    const username = profile.displayName.replace(/\s+/g, '').toLowerCase() + '_' + Date.now();
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${username}@linkedin.local`;
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days expiry
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, email, linkedin_access_token, linkedin_profile_id, linkedin_profile_url, linkedin_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, '', email, accessToken, profile.id, profile.profileUrl, expiresAt],
        function(err) {
          if (err) reject(err);
          else {
            const newUser = {
              id: this.lastID,
              username: username,
              email: email,
              role: 'user',
              linkedin_profile_id: profile.id
            };
            resolve(newUser);
          }
        }
      );
    });
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get LinkedIn connection status
  static async getLinkedInStatus(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT linkedin_access_token, linkedin_expires_at FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) reject(err);
          else {
            const isConnected = user && user.linkedin_access_token && new Date(user.linkedin_expires_at) > new Date();
            resolve({ connected: isConnected, user });
          }
        }
      );
    });
  }

  // Create system user for news posts
  static async createSystemUser() {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE username = ?',
        ['amp_news_bot'],
        (err, user) => {
          if (err) {
            reject(err);
          } else if (user) {
            resolve(user);
          } else {
            // Create system user
            db.run(
              'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
              ['amp_news_bot', '', 'news@ampcode.com', 'admin'],
              function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
              }
            );
          }
        }
      );
    });
  }

  // Create password reset token
  static async createPasswordResetToken(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 minutes

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt],
        function(err) {
          if (err) reject(err);
          else resolve({ token, email: user.email, username: user.username });
        }
      );
    });
  }

  // Verify reset token
  static async verifyResetToken(token) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT prt.*, u.id as user_id, u.email, u.username 
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = ? AND prt.used = 0 AND datetime(prt.expires_at) > datetime('now')`,
        [token],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
  }

  // Reset password using token
  static async resetPassword(token, newPassword) {
    const tokenData = await this.verifyResetToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Update password
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, tokenData.user_id],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            // Mark token as used
            db.run(
              'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
              [token],
              function(err) {
                if (err) reject(err);
                else resolve({ success: true, username: tokenData.username });
              }
            );
          }
        );
      });
    });
  }

  // Update password for authenticated user
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }

  // Get all users for admin panel
  static async getAllUsers() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          u.id, 
          u.username, 
          u.email, 
          u.role,
          u.created_at,
          us.total_points,
          us.current_streak,
          COUNT(pu.id) as total_posts
        FROM users u
        LEFT JOIN user_scores us ON u.id = us.user_id
        LEFT JOIN post_usage pu ON u.id = pu.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC`,
        (err, users) => {
          if (err) reject(err);
          else resolve(users || []);
        }
      );
    });
  }
}

module.exports = User;
