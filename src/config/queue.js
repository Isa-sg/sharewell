const Queue = require('bull');
const redis = require('./redis');

// Create job queues
const newsQueue = new Queue('news processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
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

const aiQueue = new Queue('ai processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
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

const emailQueue = new Queue('email processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
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
class JobTracker {
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
}

module.exports = {
  newsQueue,
  aiQueue,
  emailQueue,
  JobTracker,
  redis,
};
