# ShareWell Agent Instructions

## Project Structure

This LinkedIn Content Distributor has been refactored from a monolithic architecture to a modular structure:

```
src/
├── config/          # Configuration files
│   ├── database.js  # Database setup and initialization
│   ├── env.js       # Environment variables
│   ├── scoring.js   # Scoring system configuration
│   └── templates.js # Post personalization templates
├── controllers/     # Business logic
│   ├── authController.js    # Authentication logic
│   ├── postsController.js   # Posts management
│   ├── scoringController.js # User scoring system
│   └── adminController.js   # Admin functionality
├── models/          # Database models
│   ├── User.js      # User model
│   ├── Post.js      # Post model
│   ├── PostUsage.js # Post usage tracking
│   └── Scoring.js   # Scoring system model
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   ├── posts.js     # Posts CRUD and LinkedIn posting
│   ├── scoring.js   # Scoring system endpoints
│   └── admin.js     # Admin panel endpoints
├── services/        # External services
│   ├── aiService.js      # Claude AI integration
│   ├── newsService.js    # Amp news scraping
│   └── linkedinService.js # LinkedIn API integration
├── middleware/      # Custom middleware
│   └── passport.js  # Passport OAuth configuration
└── utils/           # Utility functions
    └── scheduler.js # News fetching scheduler
```

## Commands

### Development
- **Start server**: `npm start` (production-ready version)
- **Start development server**: `npm run dev` (with nodemon)
- **Start legacy server**: `npm run start:old` (original version)
- **Install dependencies**: `npm install`

### Database Management
- **Run migrations**: `npm run migrate`
- **Create backup**: `npm run backup`
- **Test infrastructure**: `node test-final.js`

### Docker
- **Build image**: `npm run docker:build`
- **Development with Docker**: `npm run docker:dev`
- **Production with Docker**: `npm run docker:prod`

### Testing
- **Test infrastructure**: `REDIS_ENABLED=false node test-final.js`
- **Check server startup**: `REDIS_ENABLED=false node -c server_new.js`

## Key Features

1. **Authentication System**
   - Regular login/register
   - LinkedIn OAuth integration
   - Session management

2. **Posts Management**
   - Create, read, delete posts with pagination
   - LinkedIn posting integration
   - Post personalization templates
   - AI-powered post generation and modification (async with job queues)

3. **Scoring System**
   - Points for posting activity
   - Streak tracking
   - Achievement system
   - Leaderboard

4. **Admin Panel**
   - News sync management
   - Posting statistics
   - User analytics

5. **AI Integration**
   - Claude API for post generation
   - Multiple writing styles
   - Post modification capabilities
   - Async job processing

6. **Infrastructure Features** 
   - Database connection pooling
   - Migration system with rollback support
   - Automatic backup system
   - Background job queues (Bull/Redis)
   - Structured logging (Winston)
   - Health check endpoints
   - OpenAPI/Swagger documentation
   - Docker support with dev/prod configs
   - Graceful Redis fallback

## Environment Variables Required

```
PORT=3000
SESSION_SECRET=your-secret-key
CLAUDE_API_KEY=your-claude-api-key
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=your-redirect-uri
```

## Database

Uses SQLite with the following tables:
- `users` - User accounts and LinkedIn tokens
- `posts` - Content posts
- `post_usage` - Tracking of post usage and LinkedIn posting
- `user_scores` - User scoring and streaks
- `point_transactions` - Point award history
- `user_achievements` - Achievement tracking

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/linkedin` - LinkedIn OAuth
- `GET /auth/linkedin/callback` - LinkedIn OAuth callback
- `GET /auth/linkedin/status` - Check LinkedIn connection

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/use` - Track post usage
- `POST /api/posts/:id/mark-posted` - Mark as posted manually
- `POST /api/posts/:id/linkedin` - Post to LinkedIn
- `GET /api/posts/status` - Get user's posted posts
- `POST /api/posts/:id/personalize` - Personalize with templates
- `GET /api/posts/personalization/templates` - Get available templates
- `POST /api/posts/generate-ai` - Generate AI post
- `POST /api/posts/:id/modify-ai` - Modify post with AI

### Scoring
- `GET /api/user/score` - Get user score and ranking
- `GET /api/user/achievements` - Get user achievements
- `GET /api/user/point-history` - Get point transaction history
- `GET /api/user/leaderboard` - Get leaderboard

### Admin
- `POST /api/admin/sync-news` - Manually sync news
- `GET /api/admin/news-status` - Get news sync status
- `GET /api/admin/scoring-stats` - Get admin dashboard stats
- `GET /api/admin/posting-trends` - Get posting trends

## Migration Notes

The refactoring maintains 100% backward compatibility. All existing functionality has been preserved while improving code organization and maintainability.
