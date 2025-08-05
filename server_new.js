const express = require('express');
require('dotenv').config();

// Import configuration
const { config, validateConfig } = require('./src/config/environment');
const { logger, requestLogger, errorLogger } = require('./src/config/logger');
const { initializeDatabase } = require('./src/config/database');
const DatabaseMigrator = require('./src/config/migrations');
const DatabaseBackup = require('./src/utils/database-backup');
const { specs, swaggerUi, swaggerOptions } = require('./src/config/swagger');
const { paginationMiddleware } = require('./src/utils/pagination');

// Import job processors
require('./src/jobs/processors');

// Import middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./src/routes/auth');
const postsRoutes = require('./src/routes/posts');
const scoringRoutes = require('./src/routes/scoring');
const adminRoutes = require('./src/routes/admin');
const healthRoutes = require('./src/routes/health');
const jobsRoutes = require('./src/routes/jobs');

const app = express();

// Validate environment configuration
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

// Trust proxy for accurate IP addresses
if (config.environment === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.linkedin.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: config.security.corsOrigin === '*' ? true : config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.environment === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
  },
}));

// Request logging middleware
app.use(requestLogger);

// Static files
app.use(express.static('public'));

// Pagination middleware for API routes
app.use('/api', paginationMiddleware());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Health check routes (no auth required)
app.use('/health', healthRoutes);
app.use('/ready', healthRoutes);
app.use('/live', healthRoutes);

// API routes
app.use('/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/user', scoringRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobsRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ShareWell API',
    version: '1.0.0',
    environment: config.environment,
    documentation: '/api-docs',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorLogger);
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  const statusCode = err.statusCode || 500;
  const message = config.environment === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    error: err.name || 'Server Error',
    message,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  try {
    // Close database connections
    const { dbPool } = require('./src/config/database');
    await dbPool.close();
    
    // Close Redis connections
    const { redis } = require('./src/config/queue');
    await redis.disconnect();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise,
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
  
  // Give some time for logs to be written, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Initialize application
async function initializeApp() {
  try {
    logger.info('Starting ShareWell application initialization');
    
    // Initialize database
    logger.info('Initializing database...');
    initializeDatabase();
    
    // Run migrations
    logger.info('Running database migrations...');
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    
    // Setup automatic backups
    if (config.backup.autoBackupInterval > 0) {
      logger.info(`Setting up automatic backups every ${config.backup.autoBackupInterval} hours`);
      const backup = new DatabaseBackup();
      await backup.scheduleAutoBackup(config.backup.autoBackupInterval);
    }
    
    // Start server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`ShareWell server started successfully`, {
        port: config.server.port,
        host: config.server.host,
        environment: config.environment,
        nodeVersion: process.version,
        pid: process.pid,
      });
      
      logger.info('Available endpoints:', {
        api: `http://${config.server.host}:${config.server.port}/api`,
        docs: `http://${config.server.host}:${config.server.port}/api-docs`,
        health: `http://${config.server.host}:${config.server.port}/health`,
      });
    });
    
    // Graceful shutdown for server
    const originalShutdown = gracefulShutdown;
    gracefulShutdown = async (signal) => {
      server.close(() => {
        logger.info('HTTP server closed');
      });
      await originalShutdown(signal);
    };
    
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();

module.exports = app;
