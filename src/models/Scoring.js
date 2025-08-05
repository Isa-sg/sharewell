const { db } = require('../config/database');
const { SCORING_CONFIG, ACHIEVEMENTS } = require('../config/scoring');

class Scoring {
  // Award points to user
  static async awardPoints(userId, points, reason, postId = null) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO point_transactions (user_id, points, reason, post_id) VALUES (?, ?, ?, ?)',
        [userId, points, reason, postId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Update user's total score
  static async updateUserScore(userId) {
    return new Promise((resolve, reject) => {
      // Calculate total points from transactions
      db.get(
        'SELECT COALESCE(SUM(points), 0) as total_points FROM point_transactions WHERE user_id = ?',
        [userId],
        (err, result) => {
          if (err) return reject(err);
          
          const totalPoints = result.total_points;
          
          // Update or insert user score
          db.run(
            `INSERT OR REPLACE INTO user_scores (user_id, total_points, updated_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [userId, totalPoints],
            function(err) {
              if (err) reject(err);
              else resolve(totalPoints);
            }
          );
        }
      );
    });
  }

  // Calculate user's streak
  static async calculateStreak(userId) {
    return new Promise((resolve, reject) => {
      // Get last 30 days of posts to calculate streak
      db.all(
        `SELECT DATE(posted_at) as post_date 
         FROM post_usage 
         WHERE user_id = ? AND status = 'posted'
         ORDER BY posted_at DESC
         LIMIT 30`,
        [userId],
        (err, posts) => {
          if (err) return reject(err);
          
          let currentStreak = 0;
          let bestStreak = 0;
          let tempStreak = 0;
          let lastDate = null;
          
          const uniqueDates = [...new Set(posts.map(p => p.post_date))].sort().reverse();
          
          for (let i = 0; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i]);
            
            if (i === 0) {
              // Check if posted today or yesterday for current streak
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (currentDate.toDateString() === today.toDateString() || 
                  currentDate.toDateString() === yesterday.toDateString()) {
                currentStreak = 1;
              }
              tempStreak = 1;
            } else {
              const expectedDate = new Date(lastDate);
              expectedDate.setDate(expectedDate.getDate() - 1);
              
              if (currentDate.toDateString() === expectedDate.toDateString()) {
                tempStreak++;
                if (i < 2) currentStreak = tempStreak; // Only count recent days for current streak
              } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
              }
            }
            
            lastDate = currentDate;
          }
          
          bestStreak = Math.max(bestStreak, tempStreak);
          
          // Update streak in database
          db.run(
            `UPDATE user_scores 
             SET current_streak = ?, best_streak = ?, last_post_date = CURRENT_DATE 
             WHERE user_id = ?`,
            [currentStreak, bestStreak, userId],
            (err) => {
              if (err) return reject(err);
              resolve({ currentStreak, bestStreak });
            }
          );
        }
      );
    });
  }

  // Check and award achievements
  static async checkAndAwardAchievements(userId) {
    try {
      // Get user stats
      const stats = await new Promise((resolve, reject) => {
        db.get(
          `SELECT 
            us.posts_count, us.current_streak, us.best_streak,
            COUNT(pu.id) as total_posts,
            COUNT(CASE WHEN DATE(pu.posted_at) >= DATE('now', '-7 days') THEN 1 END) as weekly_posts
           FROM user_scores us
           LEFT JOIN post_usage pu ON us.user_id = pu.user_id AND pu.status = 'posted'
           WHERE us.user_id = ?
           GROUP BY us.user_id`,
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!stats) return [];

      // Get existing achievements
      const existingAchievements = await new Promise((resolve, reject) => {
        db.all(
          'SELECT achievement_type FROM user_achievements WHERE user_id = ?',
          [userId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.achievement_type));
          }
        );
      });

      const newAchievements = [];

      // Check for new achievements
      if (stats.total_posts === 1 && !existingAchievements.includes('FIRST_POST')) {
        newAchievements.push('FIRST_POST');
      }
      if (stats.current_streak >= 3 && !existingAchievements.includes('STREAK_3')) {
        newAchievements.push('STREAK_3');
      }
      if (stats.current_streak >= 7 && !existingAchievements.includes('STREAK_7')) {
        newAchievements.push('STREAK_7');
      }
      if (stats.current_streak >= 30 && !existingAchievements.includes('STREAK_30')) {
        newAchievements.push('STREAK_30');
      }
      if (stats.total_posts >= 10 && !existingAchievements.includes('POSTS_10')) {
        newAchievements.push('POSTS_10');
      }
      if (stats.total_posts >= 50 && !existingAchievements.includes('POSTS_50')) {
        newAchievements.push('POSTS_50');
      }
      if (stats.total_posts >= 100 && !existingAchievements.includes('POSTS_100')) {
        newAchievements.push('POSTS_100');
      }
      if (stats.weekly_posts >= 5 && !existingAchievements.includes('WEEKLY_5')) {
        newAchievements.push('WEEKLY_5');
      }

      // Award new achievements
      for (const achievementType of newAchievements) {
        const achievement = ACHIEVEMENTS[achievementType];
        if (achievement) {
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded) VALUES (?, ?, ?, ?, ?)',
              [userId, achievementType, achievement.name, achievement.description, achievement.points],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          // Award points for achievement
          await this.awardPoints(userId, achievement.points, `Achievement: ${achievement.name}`);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // Process post scoring
  static async processPostScoring(userId, postId) {
    try {
      // Base points for posting
      let totalPoints = SCORING_CONFIG.POST_POINTS;
      let pointsBreakdown = [`Post: +${SCORING_CONFIG.POST_POINTS}`];

      // Check if this is user's first post
      const PostUsage = require('./PostUsage');
      const postCount = await PostUsage.getUserPostCount(userId);

      // Award first post bonus
      if (postCount === 1) {
        totalPoints += SCORING_CONFIG.FIRST_POST_BONUS;
        pointsBreakdown.push(`First Post Bonus: +${SCORING_CONFIG.FIRST_POST_BONUS}`);
      }

      // Award base points
      await this.awardPoints(userId, SCORING_CONFIG.POST_POINTS, 'LinkedIn Post', postId);

      // Award first post bonus if applicable
      if (postCount === 1) {
        await this.awardPoints(userId, SCORING_CONFIG.FIRST_POST_BONUS, 'First Post Bonus', postId);
      }

      // Calculate and update streak
      const { currentStreak } = await this.calculateStreak(userId);

      // Award streak bonus
      if (currentStreak > 1) {
        const streakBonus = SCORING_CONFIG.STREAK_MULTIPLIER * (currentStreak - 1);
        totalPoints += streakBonus;
        pointsBreakdown.push(`${currentStreak}-day Streak: +${streakBonus}`);
        await this.awardPoints(userId, streakBonus, `${currentStreak}-day streak bonus`, postId);
      }

      // Check for achievements
      const newAchievements = await this.checkAndAwardAchievements(userId);

      // Update total score
      await this.updateUserScore(userId);

      return {
        pointsAwarded: totalPoints,
        breakdown: pointsBreakdown,
        newAchievements: newAchievements,
        currentStreak: currentStreak
      };

    } catch (error) {
      console.error('Error processing post scoring:', error);
      return { pointsAwarded: 0, breakdown: [], newAchievements: [], currentStreak: 0 };
    }
  }

  // Get user score and ranking
  static async getUserScore(userId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          us.total_points,
          us.current_streak,
          us.best_streak,
          us.posts_count,
          COUNT(pu.id) as actual_posts_count,
          (SELECT COUNT(*) + 1 FROM user_scores us2 WHERE us2.total_points > us.total_points) as rank,
          (SELECT COUNT(*) FROM user_scores) as total_users
        FROM user_scores us
        LEFT JOIN post_usage pu ON us.user_id = pu.user_id AND pu.status = 'posted'
        WHERE us.user_id = ?
        GROUP BY us.user_id
      `, [userId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Initialize user score if doesn't exist
  static async initializeUserScore(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO user_scores (user_id, total_points) VALUES (?, 0)',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Get user achievements
  static async getUserAchievements(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC',
        [userId],
        (err, achievements) => {
          if (err) reject(err);
          else resolve(achievements || []);
        }
      );
    });
  }

  // Get user point history
  static async getUserPointHistory(userId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          pt.*,
          p.title as post_title
        FROM point_transactions pt
        LEFT JOIN posts p ON pt.post_id = p.id
        WHERE pt.user_id = ?
        ORDER BY pt.created_at DESC
        LIMIT 50
      `, [userId], (err, transactions) => {
        if (err) reject(err);
        else resolve(transactions || []);
      });
    });
  }

  // Get leaderboard
  static async getLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          us.total_points,
          us.current_streak,
          us.best_streak,
          u.username,
          COUNT(pu.id) as posts_count,
          ROW_NUMBER() OVER (ORDER BY us.total_points DESC) as rank
        FROM user_scores us
        JOIN users u ON us.user_id = u.id
        LEFT JOIN post_usage pu ON us.user_id = pu.user_id AND pu.status = 'posted'
        WHERE u.role != 'admin'
        GROUP BY us.user_id
        ORDER BY us.total_points DESC
        LIMIT ?
      `, [limit], (err, leaderboard) => {
        if (err) reject(err);
        else resolve(leaderboard || []);
      });
    });
  }
}

module.exports = Scoring;
