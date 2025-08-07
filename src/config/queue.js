// Check if Redis should be enabled
let REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

let newsQueue, aiQueue, emailQueue, redis, JobTracker;

// Try to initialize Redis-based queues
if (REDIS_ENABLED) {
  try {
    const Queue = require('bull');
    redis = require('./redis');

    // Redis configuration for Bull
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 3000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    };

    newsQueue = new Queue('news processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    aiQueue = new Queue('ai processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    emailQueue = new Queue('email processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Queue event handlers
    const setupQueueEvents = (queue, name) => {
      queue.on('completed', (job) => {
        console.log(`${name} job ${job.id} completed`);
      });

      queue.on('failed', (job, err) => {
        console.error(`${name} job ${job.id} failed:`, err.message);
      });

      queue.on('stalled', (job) => {
        console.warn(`${name} job ${job.id} stalled`);
      });

      queue.on('progress', (job, progress) => {
        console.log(`${name} job ${job.id} progress: ${progress}%`);
      });
    };

    setupQueueEvents(newsQueue, 'News');
    setupQueueEvents(aiQueue, 'AI');
    setupQueueEvents(emailQueue, 'Email');

    // Job status tracking
    JobTracker = class {
      static async getJobStatus(jobId, queueName) {
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
        if (!job) {
          return { status: 'not_found' };
        }

        const state = await job.getState();
        return {
          id: job.id,
          status: state,
          progress: job.progress(),
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
        };
      }

      static async getQueueStats(queueName) {
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

        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        return {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        };
      }
    };

    console.log('Job queues initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize job queues, falling back to mock implementation:', error.message);
    REDIS_ENABLED = false;
  }
}

// Create mock implementations if Redis is disabled or failed
if (!REDIS_ENABLED) {
  console.log('Using mock job queue implementation (Redis disabled)');
  
  const mockQueue = {
    add: () => Promise.reject(new Error('Job queues not available (Redis disabled)')),
    process: () => {},
    on: () => {},
    getJob: () => Promise.resolve(null),
    getWaiting: () => Promise.resolve([]),
    getActive: () => Promise.resolve([]),
    getCompleted: () => Promise.resolve([]),
    getFailed: () => Promise.resolve([]),
    getDelayed: () => Promise.resolve([]),
  };

  newsQueue = mockQueue;
  aiQueue = mockQueue;
  emailQueue = mockQueue;
  redis = null;

  JobTracker = class {
    static async getJobStatus(jobId, queueName) {
      return { status: 'not_available', message: 'Job queues not available (Redis disabled)' };
    }

    static async getQueueStats(queueName) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        message: 'Job queues not available (Redis disabled)',
      };
    }
  };
}

module.exports = {
  newsQueue,
  aiQueue,
  emailQueue,
  JobTracker,
  redis,
  REDIS_ENABLED,
};
