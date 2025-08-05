// Scoring System Configuration
const SCORING_CONFIG = {
  POST_POINTS: 10,           // Base points for posting
  STREAK_MULTIPLIER: 2,      // Extra points for consecutive days
  WEEKLY_BONUS: 50,          // Bonus for posting 5+ times per week
  ACHIEVEMENT_BONUS: 100,    // Bonus points for achievements
  FIRST_POST_BONUS: 25,      // Bonus for user's first post
};

const ACHIEVEMENTS = {
  FIRST_POST: { name: "First Post", description: "Posted your first LinkedIn post", points: 25 },
  STREAK_3: { name: "3-Day Streak", description: "Posted for 3 consecutive days", points: 30 },
  STREAK_7: { name: "Week Warrior", description: "Posted for 7 consecutive days", points: 75 },
  STREAK_30: { name: "Monthly Master", description: "Posted for 30 consecutive days", points: 200 },
  POSTS_10: { name: "Getting Started", description: "Posted 10 times", points: 50 },
  POSTS_50: { name: "Regular Poster", description: "Posted 50 times", points: 150 },
  POSTS_100: { name: "Century Club", description: "Posted 100 times", points: 300 },
  WEEKLY_5: { name: "Weekly Warrior", description: "Posted 5 times in one week", points: 50 },
};

module.exports = { SCORING_CONFIG, ACHIEVEMENTS };
