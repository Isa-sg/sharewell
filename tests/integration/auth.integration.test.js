const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';
process.env.DATABASE_PATH = path.join(__dirname, '../../linkedin_distributor_integration_test.db');

const app = require('../../server_new');
const DatabaseMigrator = require('../../src/config/migrations');

describe('Authentication Integration Tests', () => {
  let server;
  const testDbPath = process.env.DATABASE_PATH;

  beforeAll(async () => {
    // Initialize database
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    // Clean up between tests if needed
  });

  describe('POST /auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        email: 'integration@test.com',
        password: 'password123',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
    });

    test('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User'
      };

      // Register first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'incomplete@test.com'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user for login tests
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@test.com',
          password: 'password123',
          firstName: 'Login',
          lastName: 'Test'
        });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout successfully', async () => {
      const agent = request.agent(app);

      // First login
      await agent
        .post('/auth/register')
        .send({
          email: 'logout@test.com',
          password: 'password123',
          firstName: 'Logout',
          lastName: 'Test'
        });

      await agent
        .post('/auth/login')
        .send({
          email: 'logout@test.com',
          password: 'password123'
        });

      // Then logout
      const response = await agent
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
