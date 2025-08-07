const bcrypt = require('bcryptjs');
const authController = require('../../src/controllers/authController');
const { testUsers } = require('../fixtures/users');

// Mock database
const mockDatabase = {
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn()
};

// Mock modules
jest.mock('../../src/config/database', () => ({
  database: mockDatabase
}));

jest.mock('../../src/config/migrations', () => {
  return jest.fn().mockImplementation(() => ({
    migrate: jest.fn().mockResolvedValue(true)
  }));
});

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      session: {},
      logout: jest.fn(callback => callback())
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      redirect: jest.fn(() => res)
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register a new user successfully', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockDatabase.get.mockResolvedValue(null); // User doesn't exist
      mockDatabase.run.mockResolvedValue({ lastID: 1 });

      await authController.register(req, res);

      expect(mockDatabase.get).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = ?',
        ['test@example.com']
      );
      expect(mockDatabase.run).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully'
      });
    });

    test('should reject duplicate email', async () => {
      req.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockDatabase.get.mockResolvedValue({ id: 1 }); // User exists

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already registered'
      });
    });

    test('should validate required fields', async () => {
      req.body = {
        email: 'test@example.com'
        // Missing required fields
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required'
      });
    });
  });

  describe('login', () => {
    test('should login with valid credentials', async () => {
      req.body = {
        email: 'john@test.com',
        password: 'password123'
      };

      mockDatabase.get.mockResolvedValue(testUsers.john);

      await authController.login(req, res);

      expect(req.session.userId).toBe(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful'
      });
    });

    test('should reject invalid credentials', async () => {
      req.body = {
        email: 'john@test.com',
        password: 'wrongpassword'
      };

      mockDatabase.get.mockResolvedValue(testUsers.john);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    test('should reject non-existent user', async () => {
      req.body = {
        email: 'nonexistent@test.com',
        password: 'password123'
      };

      mockDatabase.get.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });
  });

  describe('logout', () => {
    test('should logout successfully', async () => {
      req.session.userId = 1;

      await authController.logout(req, res);

      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });
});
