module.exports = {
  up: (db) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Index for posts performance
        db.run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)', (err) => {
          if (err) console.log('Index idx_posts_created_at already exists or error:', err.message);
        });
        
        db.run('CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by)', (err) => {
          if (err) console.log('Index idx_posts_created_by already exists or error:', err.message);
        });

        // Index for user scores performance
        db.run('CREATE INDEX IF NOT EXISTS idx_user_scores_total_points ON user_scores(total_points DESC)', (err) => {
          if (err) console.log('Index idx_user_scores_total_points already exists or error:', err.message);
        });
        
        db.run('CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON user_scores(user_id)', (err) => {
          if (err) console.log('Index idx_user_scores_user_id already exists or error:', err.message);
        });

        // Index for post usage tracking
        db.run('CREATE INDEX IF NOT EXISTS idx_post_usage_user_id ON post_usage(user_id)', (err) => {
          if (err) console.log('Index idx_post_usage_user_id already exists or error:', err.message);
        });
        
        db.run('CREATE INDEX IF NOT EXISTS idx_post_usage_post_id ON post_usage(post_id)', (err) => {
          if (err) console.log('Index idx_post_usage_post_id already exists or error:', err.message);
        });
        
        db.run('CREATE INDEX IF NOT EXISTS idx_post_usage_posted_at ON post_usage(posted_at)', (err) => {
          if (err) console.log('Index idx_post_usage_posted_at already exists or error:', err.message);
        });

        // Index for point transactions
        db.run('CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id)', (err) => {
          if (err) console.log('Index idx_point_transactions_user_id already exists or error:', err.message);
        });
        
        db.run('CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at)', (err) => {
          if (err) console.log('Index idx_point_transactions_created_at already exists or error:', err.message);
        });

        // Index for user achievements
        db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)', (err) => {
          if (err) console.log('Index idx_user_achievements_user_id already exists or error:', err.message);
          resolve();
        });
      });
    });
  },

  down: (db) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DROP INDEX IF EXISTS idx_posts_created_at');
        db.run('DROP INDEX IF EXISTS idx_posts_created_by');
        db.run('DROP INDEX IF EXISTS idx_user_scores_total_points');
        db.run('DROP INDEX IF EXISTS idx_user_scores_user_id');
        db.run('DROP INDEX IF EXISTS idx_post_usage_user_id');
        db.run('DROP INDEX IF EXISTS idx_post_usage_post_id');
        db.run('DROP INDEX IF EXISTS idx_post_usage_posted_at');
        db.run('DROP INDEX IF EXISTS idx_point_transactions_user_id');
        db.run('DROP INDEX IF EXISTS idx_point_transactions_created_at');
        db.run('DROP INDEX IF EXISTS idx_user_achievements_user_id', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
};
