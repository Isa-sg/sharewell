const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';
process.env.SESSION_SECRET = 'test-secret';
process.env.CLAUDE_API_KEY = 'test-key';
process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/auth/linkedin/callback';

// Use in-memory database for tests
const testDbPath = path.join(__dirname, '../linkedin_distributor_test.db');
process.env.DATABASE_PATH = testDbPath;

// Clean up test database before each test
beforeEach(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Global timeout for async operations
jest.setTimeout(10000);
