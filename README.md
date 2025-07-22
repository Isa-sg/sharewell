# LinkedIn Content Distributor

A web application that allows companies to create LinkedIn posts and share them across team members' profiles.

## Features

- **User Authentication**: Register and login system
- **Admin Panel**: Create and manage LinkedIn posts
- **Team Dashboard**: Browse and share posts on LinkedIn
- **Post Management**: Track post usage and analytics
- **Responsive Design**: Works on desktop and mobile

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Authentication**: Session-based with bcrypt

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to `http://localhost:3000`

## Usage

### Getting Started

1. **Register a new account** or login with existing credentials
2. **Admin users** can create posts in the Admin Panel
3. **Team members** can browse posts in the Dashboard
4. **Click on any post** to view details and share on LinkedIn

### Creating Posts

1. Navigate to the Admin Panel
2. Fill in the post title and content
3. Optionally add an image URL
4. Click "Create Post"

### Sharing Posts

1. Go to the Dashboard
2. Click on any post to open the modal
3. Use "Copy Post Content" to copy the text
4. Click "Open LinkedIn" to go to LinkedIn's sharing page
5. Mark the post as used for tracking

## Project Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── linkedin_distributor.db # SQLite database (created automatically)
├── public/
│   ├── index.html         # Main page
│   ├── admin.html         # Admin panel
│   ├── dashboard.html     # Team dashboard
│   ├── style.css          # Styling
│   ├── script.js          # Main page JavaScript
│   ├── admin.js           # Admin panel JavaScript
│   └── dashboard.js       # Dashboard JavaScript
└── README.md              # This file
```

## Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `password` (Hashed)
- `email` (Unique)
- `role` (admin/user)
- `created_at`

### Posts Table
- `id` (Primary Key)
- `title`
- `content`
- `image_url` (Optional)
- `created_by` (Foreign Key to Users)
- `created_at`

### Post Usage Table
- `id` (Primary Key)
- `post_id` (Foreign Key to Posts)
- `user_id` (Foreign Key to Users)
- `posted_at`

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/use` - Mark post as used

## Future Enhancements

- LinkedIn API integration for direct posting
- Post scheduling
- Analytics and reporting
- Team management
- Post approval workflow
- Rich text editor
- Image upload functionality

## Security Notes

- Change the session secret in `server.js` for production
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Consider using environment variables for configuration

## License

This project is open source and available under the MIT License.
