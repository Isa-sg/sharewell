const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';
process.env.DATABASE_PATH = path.join(__dirname, '../../linkedin_distributor_posts_test.db');

const app = require('../../server_new');
const DatabaseMigrator = require('../../src/config/migrations');

describe('Posts Integration Tests', () => {
  let server;
  let authenticatedAgent;
  const testDbPath = process.env.DATABASE_PATH;

  beforeAll(async () => {
    // Initialize database
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    
    server = app.listen(0);
    
    // Create authenticated agent
    authenticatedAgent = request.agent(app);
    
    // Register and login a test user
    await authenticatedAgent
      .post('/auth/register')
      .send({
        email: 'posts@test.com',
        password: 'password123',
        firstName: 'Posts',
        lastName: 'Test'
      });

    await authenticatedAgent
      .post('/auth/login')
      .send({
        email: 'posts@test.com',
        password: 'password123'
      });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/posts', () => {
    test('should return empty posts list initially', async () => {
      const response = await authenticatedAgent
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/posts')
        .expect(401);
    });
  });

  describe('POST /api/posts', () => {
    test('should create a new post', async () => {
      const postData = {
        content: 'This is a test post for integration testing'
      };

      const response = await authenticatedAgent
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(postData.content);
      expect(response.body.data.id).toBeDefined();
    });

    test('should validate content requirement', async () => {
      const response = await authenticatedAgent
        .post('/api/posts')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content is required');
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/posts')
        .send({ content: 'Test post' })
        .expect(401);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let postId;

    beforeEach(async () => {
      // Create a post to delete
      const response = await authenticatedAgent
        .post('/api/posts')
        .send({ content: 'Post to be deleted' });
      
      postId = response.body.data.id;
    });

    test('should delete own post', async () => {
      const response = await authenticatedAgent
        .delete(`/api/posts/${postId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    test('should return 404 for non-existent post', async () => {
      const response = await authenticatedAgent
        .delete('/api/posts/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/posts/${postId}`)
        .expect(401);
    });
  });

  describe('POST /api/posts/:id/use', () => {
    let postId;

    beforeEach(async () => {
      const response = await authenticatedAgent
        .post('/api/posts')
        .send({ content: 'Post to be used' });
      
      postId = response.body.data.id;
    });

    test('should track post usage', async () => {
      const response = await authenticatedAgent
        .post(`/api/posts/${postId}/use`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post usage tracked');
    });

    test('should award points for usage', async () => {
      await authenticatedAgent
        .post(`/api/posts/${postId}/use`);

      // Check if points were awarded
      const scoreResponse = await authenticatedAgent
        .get('/api/user/score')
        .expect(200);

      expect(scoreResponse.body.data.totalPoints).toBeGreaterThan(0);
    });
  });

  describe('GET /api/posts/status', () => {
    test('should return user post status', async () => {
      const response = await authenticatedAgent
        .get('/api/posts/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('postedToday');
      expect(response.body.data).toHaveProperty('totalPosted');
      expect(response.body.data).toHaveProperty('currentStreak');
    });
  });

  describe('POST /api/posts/generate-ai', () => {
    test('should generate AI post with valid parameters', async () => {
      const response = await authenticatedAgent
        .post('/api/posts/generate-ai')
        .send({
          topic: 'artificial intelligence',
          style: 'professional',
          tone: 'informative'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
    });

    test('should validate required parameters', async () => {
      const response = await authenticatedAgent
        .post('/api/posts/generate-ai')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Topic is required for AI generation');
    });
  });
});
