const scoringController = require('../../src/controllers/scoringController');
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

describe('ScoringController', () => {
  let req, res;

  beforeEach(() => {
    req = {
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

  describe('getUserScore', () => {
    test('should return user score and ranking', async () => {
      const mockScore = {
        totalPoints: 150,
        currentStreak: 5,
        longestStreak: 10,
        rank: 3,
        totalUsers: 20
      };

      mockDatabase.get
        .mockResolvedValueOnce({ totalPoints: 150, currentStreak: 5, longestStreak: 10 })
        .mockResolvedValueOnce({ rank: 3 })
        .mockResolvedValueOnce({ total: 20 });

      await scoringController.getUserScore(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockScore
      });
    });

    test('should handle new user with no score', async () => {
      mockDatabase.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ rank: null })
        .mockResolvedValueOnce({ total: 20 });

      await scoringController.getUserScore(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          rank: null,
          totalUsers: 20
        }
      });
    });
  });

  describe('getUserAchievements', () => {
    test('should return user achievements', async () => {
      const mockAchievements = [
        {
          type: 'first_post',
          name: 'First Post',
          description: 'Posted your first content',
          earnedAt: new Date().toISOString()
        }
      ];

      mockDatabase.all.mockResolvedValue(mockAchievements);

      await scoringController.getUserAchievements(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAchievements
      });
    });
  });

  describe('getPointHistory', () => {
    test('should return paginated point history', async () => {
      const mockHistory = [
        {
          id: 1,
          points: 10,
          reason: 'Post created',
          createdAt: new Date().toISOString()
        }
      ];

      mockDatabase.all.mockResolvedValueOnce(mockHistory);
      mockDatabase.get.mockResolvedValueOnce({ total: 1 });

      req.query = { page: 1, limit: 10 };

      await scoringController.getPointHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          transactions: mockHistory,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });
  });

  describe('getLeaderboard', () => {
    test('should return top users leaderboard', async () => {
      const mockLeaderboard = [
        {
          firstName: 'John',
          lastName: 'Doe',
          totalPoints: 250,
          currentStreak: 7
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          totalPoints: 200,
          currentStreak: 3
        }
      ];

      mockDatabase.all.mockResolvedValue(mockLeaderboard);

      await scoringController.getLeaderboard(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeaderboard
      });
    });
  });
});
