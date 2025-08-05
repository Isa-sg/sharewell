const express = require('express');
const router = express.Router();
const { JobTracker, JobManager } = require('../jobs/processors');
const { apiLogger } = require('../config/logger');

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Background job management and status tracking
 */

/**
 * @swagger
 * /api/jobs/{queueName}/{jobId}/status:
 *   get:
 *     summary: Get job status
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [news, ai, email]
 *         description: Queue name
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobStatus'
 *       404:
 *         description: Job not found
 */
router.get('/:queueName/:jobId/status', async (req, res) => {
  const { queueName, jobId } = req.params;

  try {
    const status = await JobTracker.getJobStatus(jobId, queueName);
    
    if (status.status === 'not_found') {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
        queueName,
      });
    }

    res.json(status);
  } catch (error) {
    apiLogger.error('Failed to get job status', {
      error: error.message,
      jobId,
      queueName,
    });
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/jobs/{queueName}/stats:
 *   get:
 *     summary: Get queue statistics
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [news, ai, email]
 *         description: Queue name
 *     responses:
 *       200:
 *         description: Queue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 waiting: { type: integer, example: 5 }
 *                 active: { type: integer, example: 2 }
 *                 completed: { type: integer, example: 100 }
 *                 failed: { type: integer, example: 3 }
 *                 delayed: { type: integer, example: 1 }
 */
router.get('/:queueName/stats', async (req, res) => {
  const { queueName } = req.params;

  try {
    const stats = await JobTracker.getQueueStats(queueName);
    res.json(stats);
  } catch (error) {
    apiLogger.error('Failed to get queue stats', {
      error: error.message,
      queueName,
    });
    res.status(500).json({
      error: 'Failed to get queue statistics',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/jobs/{queueName}/{jobId}/cancel:
 *   delete:
 *     summary: Cancel a job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [news, ai, email]
 *         description: Queue name
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       404:
 *         description: Job not found
 */
router.delete('/:queueName/:jobId/cancel', async (req, res) => {
  const { queueName, jobId } = req.params;

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const cancelled = await JobManager.cancelJob(jobId, queueName);
    
    if (!cancelled) {
      return res.status(404).json({
        error: 'Job not found or could not be cancelled',
        jobId,
        queueName,
      });
    }

    apiLogger.info('Job cancelled', {
      jobId,
      queueName,
      userId: req.session.userId,
    });

    res.json({
      message: 'Job cancelled successfully',
      jobId,
      queueName,
    });
  } catch (error) {
    apiLogger.error('Failed to cancel job', {
      error: error.message,
      jobId,
      queueName,
      userId: req.session.userId,
    });
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/jobs/news/scrape:
 *   post:
 *     summary: Start news scraping job
 *     tags: [Jobs, News]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *             properties:
 *               source: { type: string, example: "ampcode" }
 *               priority: { type: integer, minimum: 0, maximum: 10, default: 0 }
 *               delay: { type: integer, minimum: 0, default: 0, description: "Delay in milliseconds" }
 *     responses:
 *       202:
 *         description: News scraping job started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId: { type: string, example: "12345" }
 *                 message: { type: string, example: "News scraping started" }
 *                 statusUrl: { type: string, example: "/api/jobs/news/12345/status" }
 */
router.post('/news/scrape', async (req, res) => {
  const { source, priority = 0, delay = 0 } = req.body;

  if (!source) {
    return res.status(400).json({ error: 'Source is required' });
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const jobId = await JobManager.addNewsScrapingJob(source, req.session.userId, {
      priority,
      delay,
    });

    apiLogger.info('News scraping job started', {
      jobId,
      source,
      userId: req.session.userId,
    });

    res.status(202).json({
      jobId,
      message: 'News scraping started',
      statusUrl: `/api/jobs/news/${jobId}/status`,
      source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    apiLogger.error('Failed to start news scraping job', {
      error: error.message,
      source,
      userId: req.session.userId,
    });
    res.status(500).json({
      error: 'Failed to start news scraping',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/jobs/overview:
 *   get:
 *     summary: Get overview of all queues
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Queue overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp: { type: string, format: date-time }
 *                 queues:
 *                   type: object
 *                   properties:
 *                     news: { type: object }
 *                     ai: { type: object }
 *                     email: { type: object }
 */
router.get('/overview', async (req, res) => {
  try {
    const [newsStats, aiStats, emailStats] = await Promise.all([
      JobTracker.getQueueStats('news'),
      JobTracker.getQueueStats('ai'),
      JobTracker.getQueueStats('email'),
    ]);

    const overview = {
      timestamp: new Date().toISOString(),
      queues: {
        news: newsStats,
        ai: aiStats,
        email: emailStats,
      },
      totals: {
        waiting: newsStats.waiting + aiStats.waiting + emailStats.waiting,
        active: newsStats.active + aiStats.active + emailStats.active,
        completed: newsStats.completed + aiStats.completed + emailStats.completed,
        failed: newsStats.failed + aiStats.failed + emailStats.failed,
      },
    };

    res.json(overview);
  } catch (error) {
    apiLogger.error('Failed to get jobs overview', { error: error.message });
    res.status(500).json({
      error: 'Failed to get jobs overview',
      message: error.message,
    });
  }
});

module.exports = router;
