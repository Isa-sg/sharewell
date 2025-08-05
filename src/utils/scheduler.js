const cron = require('node-cron');
const { fetchAmpNews } = require('../services/newsService');
const Post = require('../models/Post');

// Schedule automatic news fetching every 6 hours
const startNewsScheduler = () => {
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled news sync...');
    try {
      const articles = await fetchAmpNews();
      await Post.saveNewsAsPosts(articles);
    } catch (error) {
      console.error('Scheduled news sync failed:', error.message);
    }
  });

  // Initial news sync on server start
  setTimeout(async () => {
    console.log('Running initial news sync...');
    try {
      const articles = await fetchAmpNews();
      await Post.saveNewsAsPosts(articles);
    } catch (error) {
      console.error('Initial news sync failed:', error.message);
    }
  }, 3000); // Wait 3 seconds after server start
};

module.exports = { startNewsScheduler };
