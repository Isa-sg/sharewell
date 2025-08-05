const path = require('path');
require('dotenv').config();

const environments = {
  development: 'development',
  staging: 'staging',
  production: 'production',
  test: 'test',
};

const currentEnv = process.env.NODE_ENV || 'development';

const config = {
  environment: currentEnv,
  
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
  },
  
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../linkedin_distributor.db'),
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
  },
  
  ai: {
    claudeApiKey: process.env.CLAUDE_API_KEY,
    modelName: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
  },
  
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI,
  },
  
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || (currentEnv === 'production' ? 'info' : 'debug'),
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
    errorFile: process.env.ERROR_LOG_FILE || path.join(__dirname, '../../logs/error.log'),
  },
  
  jobs: {
    newsScrapingInterval: parseInt(process.env.NEWS_SCRAPING_INTERVAL) || 24, // hours
    retryAttempts: parseInt(process.env.JOB_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.JOB_RETRY_DELAY) || 2000, // ms
  },
  
  backup: {
    autoBackupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24, // hours
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 10,
    backupPath: process.env.BACKUP_PATH || path.join(__dirname, '../../backups'),
  },
};

// Environment-specific overrides
switch (currentEnv) {
  case environments.production:
    config.logging.level = 'warn';
    config.database.poolSize = 20;
    config.security.corsOrigin = process.env.CORS_ORIGIN || 'https://yourdomain.com';
    break;
    
  case environments.staging:
    config.logging.level = 'info';
    config.database.poolSize = 15;
    break;
    
  case environments.test:
    config.database.path = ':memory:';
    config.logging.level = 'error';
    config.redis.db = 1; // Use different Redis DB for tests
    break;
    
  case environments.development:
  default:
    config.logging.level = 'debug';
    break;
}

// Validation
const validateConfig = () => {
  const requiredFields = [];
  
  if (currentEnv === 'production') {
    requiredFields.push(
      'SESSION_SECRET',
      'CLAUDE_API_KEY',
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET'
    );
  }
  
  const missing = requiredFields.filter(field => !process.env[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const isDevelopment = () => currentEnv === environments.development;
const isProduction = () => currentEnv === environments.production;
const isStaging = () => currentEnv === environments.staging;
const isTest = () => currentEnv === environments.test;

module.exports = {
  config,
  environments,
  currentEnv,
  validateConfig,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
};
