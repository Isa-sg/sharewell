const { newsQueue, aiQueue, emailQueue } = require('../config/queue');
const newsService = require('../services/newsService');
const aiService = require('../services/aiService');

// News processing job
newsQueue.process('scrape-news', async (job) => {
  const { source, userId } = job.data;
  
  try {
    job.progress(10);
    console.log(`Starting news scraping for source: ${source}`);
    
    const articles = await newsService.scrapeNews(source);
    job.progress(50);
    
    const savedPosts = [];
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const saved = await newsService.saveArticleAsPost(article, userId);
      if (saved) {
        savedPosts.push(saved);
      }
      job.progress(50 + (i / articles.length) * 40);
    }
    
    job.progress(100);
    console.log(`News scraping completed. Saved ${savedPosts.length} posts`);
    
    return {
      success: true,
      articlesFound: articles.length,
      postsSaved: savedPosts.length,
      posts: savedPosts,
    };
  } catch (error) {
    console.error('News scraping job failed:', error);
    throw error;
  }
});

// AI content generation job
aiQueue.process('generate-content', async (job) => {
  const { type, prompt, context, userId } = job.data;
  
  try {
    job.progress(10);
    console.log(`Starting AI content generation: ${type}`);
    
    let result;
    switch (type) {
      case 'post':
        result = await aiService.generatePost(prompt, context);
        break;
      case 'modify':
        result = await aiService.modifyPost(context.originalContent, prompt);
        break;
      case 'personalize':
        result = await aiService.personalizePost(context.content, context.template);
        break;
      default:
        throw new Error(`Unknown AI generation type: ${type}`);
    }
    
    job.progress(90);
    
    // Save result if needed
    if (type === 'post' && result) {
      // Save generated post to database
      const { pooledQuery } = require('../config/database');
      const insertResult = await pooledQuery.run(
        'INSERT INTO posts (title, content, created_by) VALUES (?, ?, ?)',
        ['AI Generated Post', result, userId]
      );
      result = {
        content: result,
        postId: insertResult.lastID,
      };
    }
    
    job.progress(100);
    console.log(`AI content generation completed: ${type}`);
    
    return {
      success: true,
      type,
      result,
    };
  } catch (error) {
    console.error('AI generation job failed:', error);
    throw error;
  }
});

// Email notification job
emailQueue.process('send-notification', async (job) => {
  const { to, subject, body, type } = job.data;
  
  try {
    job.progress(10);
    console.log(`Sending ${type} notification to ${to}`);
    
    // Here you would integrate with your email service
    // For now, we'll just log it
    console.log(`Email notification: ${subject} to ${to}`);
    console.log(`Body: ${body}`);
    
    job.progress(100);
    
    return {
      success: true,
      recipient: to,
      type,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error('Email notification job failed:', error);
    throw error;
  }
});

// Job utility functions
class JobManager {
  static async addNewsScrapingJob(source, userId, options = {}) {
    const job = await newsQueue.add('scrape-news', {
      source,
      userId,
    }, {
      delay: options.delay || 0,
      priority: options.priority || 0,
    });
    
    return job.id;
  }

  static async addAIGenerationJob(type, prompt, context, userId, options = {}) {
    const job = await aiQueue.add('generate-content', {
      type,
      prompt,
      context,
      userId,
    }, {
      delay: options.delay || 0,
      priority: options.priority || 0,
    });
    
    return job.id;
  }

  static async addEmailNotificationJob(to, subject, body, type, options = {}) {
    const job = await emailQueue.add('send-notification', {
      to,
      subject,
      body,
      type,
    }, {
      delay: options.delay || 0,
      priority: options.priority || 0,
    });
    
    return job.id;
  }

  static async scheduleRecurringNewsSync(source, intervalHours = 24) {
    const job = await newsQueue.add('scrape-news', {
      source,
      userId: 1, // System user
    }, {
      repeat: {
        every: intervalHours * 60 * 60 * 1000,
      },
    });
    
    console.log(`Scheduled recurring news sync for ${source} every ${intervalHours} hours`);
    return job.id;
  }

  static async cancelJob(jobId, queueName) {
    let queue;
    switch (queueName) {
      case 'news':
        queue = newsQueue;
        break;
      case 'ai':
        queue = aiQueue;
        break;
      case 'email':
        queue = emailQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }
}

module.exports = {
  JobManager,
  newsQueue,
  aiQueue,
  emailQueue,
};
