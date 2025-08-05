const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { config } = require('./environment');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShareWell API',
      version: '1.0.0',
      description: 'LinkedIn Content Distribution Platform API',
      contact: {
        name: 'ShareWell Team',
        email: 'support@sharewell.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.sharewell.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            linkedin_profile_url: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'AI Revolution in Business' },
            content: { type: 'string', example: 'The future of business is here...' },
            image_url: { type: 'string', nullable: true },
            source_url: { type: 'string', nullable: true },
            created_by: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        UserScore: {
          type: 'object',
          properties: {
            user_id: { type: 'integer', example: 1 },
            total_points: { type: 'integer', example: 150 },
            posts_count: { type: 'integer', example: 5 },
            current_streak: { type: 'integer', example: 3 },
            best_streak: { type: 'integer', example: 7 },
            last_post_date: { type: 'string', format: 'date' },
            rank: { type: 'integer', example: 1 },
          },
        },
        Achievement: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            achievement_type: { type: 'string', example: 'streak' },
            achievement_name: { type: 'string', example: 'First Post' },
            achievement_description: { type: 'string', example: 'Posted your first content' },
            points_awarded: { type: 'integer', example: 10 },
            earned_at: { type: 'string', format: 'date-time' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            current_page: { type: 'integer', example: 1 },
            per_page: { type: 'integer', example: 20 },
            total_items: { type: 'integer', example: 100 },
            total_pages: { type: 'integer', example: 5 },
            has_next: { type: 'boolean', example: true },
            has_prev: { type: 'boolean', example: false },
            links: {
              type: 'object',
              properties: {
                first: { type: 'string', example: '/api/posts?page=1' },
                last: { type: 'string', example: '/api/posts?page=5' },
                next: { type: 'string', nullable: true, example: '/api/posts?page=2' },
                prev: { type: 'string', nullable: true, example: null },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {},
            },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
        JobStatus: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '12345' },
            status: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed'], example: 'completed' },
            progress: { type: 'number', example: 100 },
            result: { type: 'object', nullable: true },
            failedReason: { type: 'string', nullable: true },
            processedOn: { type: 'string', format: 'date-time', nullable: true },
            finishedOn: { type: 'string', format: 'date-time', nullable: true },
            attemptsMade: { type: 'integer', example: 1 },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
                queues: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    news: { type: 'object' },
                    ai: { type: 'object' },
                    email: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
            version: { type: 'string', example: '1.0.0' },
            environment: { type: 'string', example: 'development' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Bad Request' },
            message: { type: 'string', example: 'Invalid input parameters' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number (starts from 1)',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page (max 100)',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field',
          required: false,
          schema: { type: 'string', default: 'created_at' },
        },
        OrderParam: {
          name: 'order',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term',
          required: false,
          schema: { type: 'string' },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ShareWell API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions,
};
