const postsController = require('../../src/controllers/postsController');
const { testUsers, testPosts } = require('../fixtures/users');

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

jest.mock('../../src/services/linkedinService', () => ({
  postToLinkedIn: jest.fn().mockResolvedValue({ success: true, id: 'linkedin123' })
}));

jest.mock('../../src/services/aiService', () => ({
  generatePost: jest.fn().mockResolvedValue({
    content: 'AI generated post content',
    confidence: 0.95
  }),
  modifyPost: jest.fn().mockResolvedValue({
    content: 'Modified post content',
    changes: ['tone', 'length']
  })
}));

describe('PostsController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      session: { userId: 1 },
      params: {},
      query: {}
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    jest.clearAllMocks();
  });

  describe('getAllPosts', () => {
    test('should return paginated posts', async () => {
      const mockPosts = [testPosts.post1, testPosts.post2];
      mockDatabase.all.mockResolvedValueOnce(mockPosts);
      mockDatabase.get.mockResolvedValueOnce({ total: 2 });

      req.query = { page: 1, limit: 10 };

      await postsController.getAllPosts(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          posts: mockPosts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });

    test('should handle database errors', async () => {
      mockDatabase.all.mockRejectedValue(new Error('Database error'));

      await postsController.getAllPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error fetching posts'
      });
    });
  });

  describe('createPost', () => {
    test('should create a new post', async () => {
      req.body = { content: 'This is a new post' };
      mockDatabase.run.mockResolvedValue({ lastID: 3 });
      mockDatabase.get.mockResolvedValue({
        id: 3,
        content: 'This is a new post',
        authorId: 1,
        createdAt: new Date().toISOString()
      });

      await postsController.createPost(req, res);

      expect(mockDatabase.run).toHaveBeenCalledWith(
        'INSERT INTO posts (content, authorId, createdAt) VALUES (?, ?, ?)',
        expect.arrayContaining(['This is a new post', 1])
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should validate content', async () => {
      req.body = { content: '' };

      await postsController.createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content is required'
      });
    });
  });

  describe('deletePost', () => {
    test('should delete user\'s own post', async () => {
      req.params.id = '1';
      mockDatabase.get.mockResolvedValue({ authorId: 1 });
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      await postsController.deletePost(req, res);

      expect(mockDatabase.run).toHaveBeenCalledWith(
        'UPDATE posts SET isDeleted = 1 WHERE id = ?',
        [1]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Post deleted successfully'
      });
    });

    test('should not delete other user\'s post', async () => {
      req.params.id = '2';
      mockDatabase.get.mockResolvedValue({ authorId: 2 });

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to delete this post'
      });
    });
  });

  describe('generateAIPost', () => {
    test('should generate AI post', async () => {
      req.body = {
        topic: 'artificial intelligence',
        style: 'professional',
        tone: 'informative'
      };

      await postsController.generateAIPost(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          content: 'AI generated post content',
          confidence: 0.95
        }
      });
    });

    test('should validate AI generation parameters', async () => {
      req.body = {}; // Missing required fields

      await postsController.generateAIPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Topic is required for AI generation'
      });
    });
  });
});
