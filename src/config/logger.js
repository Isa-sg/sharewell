const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { config } = require('./environment');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const serviceStr = service ? `[${service}] ` : '';
    return `${timestamp} ${level}: ${serviceStr}${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: { service: 'sharewell-app' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: config.logging.errorFile,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Add console transport for non-production environments
if (config.environment !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create specialized loggers for different components
const createChildLogger = (service) => {
  return logger.child({ service });
};

// Specialized loggers
const dbLogger = createChildLogger('database');
const apiLogger = createChildLogger('api');
const jobLogger = createChildLogger('jobs');
const authLogger = createChildLogger('auth');
const aiLogger = createChildLogger('ai');
const newsLogger = createChildLogger('news');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || '';
  
  // Log request
  apiLogger.info('Request started', {
    method,
    url,
    ip,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
    userId: req.user?.id,
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    apiLogger.info('Request completed', {
      method,
      url,
      statusCode,
      duration,
      userId: req.user?.id,
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const { method, url, ip } = req;
  const userId = req.user?.id;
  
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    method,
    url,
    ip,
    userId,
  });
  
  next(err);
};

// Database query logger
const logDatabaseQuery = (query, params, duration) => {
  dbLogger.debug('Database query', {
    query: query.substring(0, 200), // Truncate long queries
    params: params?.slice(0, 10), // Limit params
    duration,
  });
};

// Job logger helpers
const logJobStart = (jobType, jobId, data) => {
  jobLogger.info('Job started', {
    jobType,
    jobId,
    data: JSON.stringify(data).substring(0, 200),
  });
};

const logJobComplete = (jobType, jobId, result, duration) => {
  jobLogger.info('Job completed', {
    jobType,
    jobId,
    result: JSON.stringify(result).substring(0, 200),
    duration,
  });
};

const logJobError = (jobType, jobId, error, attemptsMade) => {
  jobLogger.error('Job failed', {
    jobType,
    jobId,
    error: {
      message: error.message,
      stack: error.stack,
    },
    attemptsMade,
  });
};

// Performance monitoring
const performanceLogger = {
  startTimer: (label) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to ms
        logger.debug('Performance metric', {
          label,
          duration,
        });
        return duration;
      },
    };
  },
};

// Health check logging
const logHealthCheck = (checks) => {
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  const level = allHealthy ? 'info' : 'warn';
  
  logger.log(level, 'Health check', { checks });
};

module.exports = {
  logger,
  dbLogger,
  apiLogger,
  jobLogger,
  authLogger,
  aiLogger,
  newsLogger,
  requestLogger,
  errorLogger,
  logDatabaseQuery,
  logJobStart,
  logJobComplete,
  logJobError,
  performanceLogger,
  logHealthCheck,
  createChildLogger,
};
