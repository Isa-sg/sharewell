// Check if Redis should be enabled
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

let redis = null;

if (REDIS_ENABLED) {
  try {
    const Redis = require('ioredis');

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 2000,
      enableReadyCheck: false,
    };

    // Create Redis connection
    redis = new Redis(redisConfig);

    redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    redis.on('error', (err) => {
      console.warn('Redis connection error (continuing without Redis):', err.message);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
  } catch (error) {
    console.warn('Redis module not available, continuing without job queues:', error.message);
    redis = null;
  }
} else {
  console.log('Redis disabled by configuration');
}

// Mock Redis for when it's not available
const mockRedis = {
  ping: () => Promise.reject(new Error('Redis not available')),
  disconnect: () => Promise.resolve(),
};

module.exports = redis || mockRedis;
