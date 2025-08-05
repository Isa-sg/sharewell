const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { redis } = require('../config/queue');
const { JobTracker } = require('../config/queue');
const { logHealthCheck } = require('../config/logger');

// Health check endpoint
router.get('/', async (req, res) => {
  const checks = {};
  let allHealthy = true;

  // Database health check
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    checks.database = { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error.message, timestamp: new Date() };
    allHealthy = false;
  }

  // Redis health check
  try {
    await redis.ping();
    checks.redis = { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    checks.redis = { status: 'unhealthy', error: error.message, timestamp: new Date() };
    allHealthy = false;
  }

  // Queue health check
  try {
    const newsStats = await JobTracker.getQueueStats('news');
    const aiStats = await JobTracker.getQueueStats('ai');
    const emailStats = await JobTracker.getQueueStats('email');
    
    checks.queues = {
      status: 'healthy',
      news: newsStats,
      ai: aiStats,
      email: emailStats,
      timestamp: new Date(),
    };
  } catch (error) {
    checks.queues = { status: 'unhealthy', error: error.message, timestamp: new Date() };
    allHealthy = false;
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  };

  checks.memory = {
    status: memUsageMB.heapUsed < 500 ? 'healthy' : 'warning', // Warning if heap usage > 500MB
    usage: memUsageMB,
    timestamp: new Date(),
  };

  // Process uptime
  checks.uptime = {
    status: 'healthy',
    seconds: process.uptime(),
    timestamp: new Date(),
  };

  // Overall status
  const overallStatus = allHealthy ? 'healthy' : 'unhealthy';
  
  // Log health check
  logHealthCheck(checks);

  const response = {
    status: overallStatus,
    timestamp: new Date(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json(response);
});

// Readiness probe - checks if app is ready to serve traffic
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    await redis.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// Liveness probe - checks if app is alive
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Detailed system metrics
router.get('/metrics', async (req, res) => {
  try {
    // System metrics
    const metrics = {
      timestamp: new Date(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    // Database metrics
    try {
      const userCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const postCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      metrics.database = {
        users: userCount,
        posts: postCount,
      };
    } catch (error) {
      metrics.database = { error: error.message };
    }

    // Queue metrics
    try {
      const newsStats = await JobTracker.getQueueStats('news');
      const aiStats = await JobTracker.getQueueStats('ai');
      const emailStats = await JobTracker.getQueueStats('email');

      metrics.queues = {
        news: newsStats,
        ai: aiStats,
        email: emailStats,
      };
    } catch (error) {
      metrics.queues = { error: error.message };
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date(),
    });
  }
});

module.exports = router;
