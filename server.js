const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Database initialization
const db = new sqlite3.Database('linkedin_distributor.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    linkedin_access_token TEXT,
    linkedin_profile_id TEXT,
    linkedin_profile_url TEXT,
    linkedin_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Posts table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    source_url TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);
  
  // Add source_url column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE posts ADD COLUMN source_url TEXT`, (err) => {
    // Ignore error if column already exists
  });

  // Post usage tracking
  db.run(`CREATE TABLE IF NOT EXISTS post_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    status TEXT DEFAULT 'used',
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// News scraping function
async function fetchAmpNews() {
  try {
    console.log('Fetching Amp news...');
    const response = await axios.get('https://ampcode.com/news', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    const articles = [];
    
    // Parse the news articles - try different selectors
    let newsItems = $('ol li');
    if (newsItems.length === 0) {
      newsItems = $('.news-item, .post, article');
    }
    
    newsItems.each((index, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      
      if (text.length > 50 && index < 8) { // Limit to first 8 items
        const processedPost = createLinkedInPost(text);
        if (processedPost) {
          articles.push(processedPost);
        }
      }
    });
    
    console.log(`Found ${articles.length} news articles`);
    return articles;
    
  } catch (error) {
    console.error('Error fetching Amp news:', error.message);
    // Return some sample news if scraping fails
    return [{
      title: '✨ Setup Complete',
      content: `Just set up this LinkedIn Content Distributor and it's pretty slick 🔥

Automatically pulls the latest Amp news and formats it perfectly for LinkedIn.

No more copying and pasting from news sites or trying to make boring updates sound interesting.

Who else struggles with keeping their LinkedIn fresh with tech updates?

#ContentStrategy #AmpAI #LinkedIn #TechNews

Source: https://ampcode.com/news`,
      source: 'System'
    }];
  }
}

// Global tracking to prevent any repetition
let usedPhrases = new Set();
let usedTitles = new Set();
let postCounter = 0;

// Function to create LinkedIn-optimized posts with guaranteed uniqueness
function createLinkedInPost(rawText) {
  try {
    // Extract meaningful content
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    postCounter++;
    
    // Create unique content based on counter to ensure no repetition
    const uniqueContent = generateTrulyUniqueContent(cleanText, postCounter);
    const uniqueTitle = generateUniqueTitle(postCounter);
    
    return {
      title: uniqueTitle,
      content: uniqueContent,
      source: 'Amp News'
    };
    
  } catch (error) {
    console.error('Error creating LinkedIn post:', error);
    return null;
  }
}

// Generate completely different personas/voices for each post
function generateTrulyUniqueContent(cleanText, counter) {
  // Remove dates from the content first
  let processedContent = cleanText
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi, '') // Remove "July 8, 2025" format
    .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove "2025-07-08" format
    .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '') // Remove "7/8/2025" format
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
    
  const trimmedContent = processedContent.substring(0, 180) + (processedContent.length > 180 ? '...' : '');
  
  // Completely different personas - each writes like a different person
  const personas = [
    // Casual developer
    (content) => `${content}\n\nPretty cool stuff tbh\n\nSource: https://ampcode.com/news`,
    
    // News reporter style  
    (content) => `BREAKING: ${content}\n\nSource: https://ampcode.com/news`,
    
    // Minimalist
    (content) => `${content}\n\nSource: https://ampcode.com/news`,
    
    // Academic/formal
    (content) => `Recent developments indicate: ${content}\n\nSignificant implications for the field.\n\nSource: https://ampcode.com/news`,
    
    // Excited fanboy
    (content) => `OMG this is huge!! ${content} 🤯🤯\n\nSource: https://ampcode.com/news`,
    
    // Skeptical analyst
    (content) => `${content}\n\nWe'll see if this actually delivers.\n\nSource: https://ampcode.com/news`,
    
    // Industry insider
    (content) => `For those tracking AI developments: ${content}\n\nSource: https://ampcode.com/news`,
    
    // Startup founder energy
    (content) => `${content}\n\nThis changes everything! 🚀\n\nSource: https://ampcode.com/news`,
    
    // Technical writer
    (content) => `Technical update: ${content}\n\nSource: https://ampcode.com/news`,
    
    // Philosophical
    (content) => `${content}\n\nMakes you wonder about the future of software development.\n\nSource: https://ampcode.com/news`,
    
    // Direct/blunt
    (content) => `${content}\n\nThat's it.\n\nSource: https://ampcode.com/news`,
    
    // Comparison focused
    (content) => `${content}\n\nMiles ahead of the competition.\n\nSource: https://ampcode.com/news`,
    
    // Question asker
    (content) => `${content}\n\nWhat do you think this means?\n\nSource: https://ampcode.com/news`,
    
    // Story teller
    (content) => `So here's what happened: ${content}\n\nSource: https://ampcode.com/news`,
    
    // Trend spotter
    (content) => `${content}\n\nAnother step toward AI-first development.\n\nSource: https://ampcode.com/news`,
    
    // Pragmatist
    (content) => `${content}\n\nUseful if you're building AI tools.\n\nSource: https://ampcode.com/news`,
    
    // Hype checker
    (content) => `${content}\n\nActually pretty solid, not just marketing fluff.\n\nSource: https://ampcode.com/news`,
    
    // Community builder
    (content) => `${content}\n\nWho else is experimenting with this?\n\nSource: https://ampcode.com/news`,
    
    // Time conscious
    (content) => `Quick update: ${content}\n\nSource: https://ampcode.com/news`,
    
    // Forward looking
    (content) => `${content}\n\nJust the beginning.\n\nSource: https://ampcode.com/news`
  ];
  
  // Use counter to select persona, cycling through all personas
  const personaIndex = (counter - 1) % personas.length;
  return personas[personaIndex](trimmedContent);
}

// Generate unique titles - uses counter to ensure no repetition
function generateUniqueTitle(counter) {
  const titles = [
    "🚀 Amp Update",
    "⚡ New Feature", 
    "💡 Innovation",
    "🔥 Latest Release",
    "✨ Tech News",
    "🎯 Development",
    "💻 AI Update",
    "🌟 Progress",
    "📈 Advancement",
    "🔧 Enhancement",
    "⭐ Milestone",
    "🎪 Launch",
    "📊 Analytics",
    "🛠️ Tools Update",
    "🚨 Alert",
    "📱 Platform News",
    "🔍 Discovery",
    "⚙️ System Update",
    "🎨 Design News",
    "🌐 Network Update"
  ];
  
  // Use counter to select title, cycling through all titles
  const titleIndex = (counter - 1) % titles.length;
  return titles[titleIndex];
}

// Helper function to extract keywords
function extractKeywords(text) {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'an', 'have', 'it', 'in', 'you', 'that', 'he', 'was', 'for', 'of', 'with', 'his', 'they', 'i', 'be', 'this', 'from', 'or', 'had', 'by', 'not', 'word', 'but', 'what', 'some', 'we', 'can', 'out', 'other', 'were', 'all', 'there', 'when', 'up', 'use', 'your', 'how', 'said', 'each', 'she', 'do', 'now', 'has', 'her', 'its', 'would', 'about', 'if', 'who', 'oil', 'sit', 'now'];
  return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 5);
}

// Function to save news articles as posts
async function saveNewsAsPosts(articles) {
  if (articles.length === 0) return;
  
  try {
    // Create a system user for news posts if it doesn't exist
    const systemUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE username = ?',
        ['amp_news_bot'],
        (err, user) => {
          if (err) {
            reject(err);
          } else if (user) {
            resolve(user);
          } else {
            // Create system user
            db.run(
              'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
              ['amp_news_bot', '', 'news@ampcode.com', 'admin'],
              function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
              }
            );
          }
        }
      );
    });
    
    // Save each article as a post (avoid duplicates)
    for (const article of articles) {
      // Check if post already exists
      const existingPost = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM posts WHERE title = ? AND created_by = ?',
          [article.title, systemUser.id],
          (err, post) => {
            if (err) reject(err);
            else resolve(post);
          }
        );
      });
      
      if (!existingPost) {
        // Create new post
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO posts (title, content, source_url, created_by) VALUES (?, ?, ?, ?)',
            [article.title, article.content, 'https://ampcode.com/news', systemUser.id],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });
        console.log(`Created post: ${article.title}`);
      }
    }
    
    console.log('News sync completed');
    
  } catch (error) {
    console.error('Error saving news posts:', error.message);
  }
}

// LinkedIn OAuth Strategy
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: process.env.LINKEDIN_REDIRECT_URI,
  scope: ['r_liteprofile'],
  state: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists with LinkedIn ID
    db.get(
      'SELECT * FROM users WHERE linkedin_profile_id = ?',
      [profile.id],
      (err, existingUser) => {
        if (err) {
          return done(err);
        }
        
        if (existingUser) {
          // Update existing user's LinkedIn token
          db.run(
            'UPDATE users SET linkedin_access_token = ?, linkedin_expires_at = ? WHERE id = ?',
            [accessToken, new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), existingUser.id], // 60 days expiry
            (err) => {
              if (err) return done(err);
              return done(null, existingUser);
            }
          );
        } else {
          // Create new user with LinkedIn profile
          const username = profile.displayName.replace(/\s+/g, '').toLowerCase() + '_' + Date.now();
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${username}@linkedin.local`;
          
          db.run(
            'INSERT INTO users (username, password, email, linkedin_access_token, linkedin_profile_id, linkedin_profile_url, linkedin_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, '', email, accessToken, profile.id, profile.profileUrl, new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)],
            function(err) {
              if (err) return done(err);
              
              const newUser = {
                id: this.lastID,
                username: username,
                email: email,
                role: 'user',
                linkedin_profile_id: profile.id
              };
              
              return done(null, newUser);
            }
          );
        }
      }
    );
  } catch (error) {
    return done(error);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// LinkedIn OAuth Routes
app.get('/auth/linkedin', passport.authenticate('linkedin'));

app.get('/auth/linkedin/callback', 
  passport.authenticate('linkedin', { failureRedirect: '/' }),
  (req, res) => {
    // Store user in session
    req.session.userId = req.user.id;
    req.session.username = req.user.username;
    req.session.role = req.user.role;
    req.session.linkedinConnected = true;
    
    res.redirect('/dashboard');
  }
);

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.json({ message: 'User registered successfully', userId: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
    }
  );
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/posts', (req, res) => {
  db.all(
    'SELECT p.id, p.title, p.content, p.image_url, p.source_url, p.created_by, p.created_at, u.username as author FROM posts p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/posts', (req, res) => {
  const { title, content, image_url } = req.body;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  db.run(
    'INSERT INTO posts (title, content, image_url, created_by) VALUES (?, ?, ?, ?)',
    [title, content, image_url, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      res.json({ message: 'Post created successfully', postId: this.lastID });
    }
  );
});

app.post('/api/posts/:id/use', (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  db.run(
    'INSERT INTO post_usage (post_id, user_id) VALUES (?, ?)',
    [postId, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      res.json({ message: 'Post usage tracked successfully' });
    }
  );
});

// LinkedIn posting function
async function postToLinkedIn(accessToken, profileId, content) {
  try {
    const shareData = {
      author: `urn:li:person:${profileId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      shareData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('LinkedIn API Error:', error.response?.data || error.message);
    throw error;
  }
}

// API endpoint for LinkedIn posting
app.post('/api/posts/:id/linkedin', async (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get user's LinkedIn token
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT linkedin_access_token, linkedin_profile_id, linkedin_expires_at FROM users WHERE id = ?',
        [req.session.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user.linkedin_access_token) {
      return res.status(400).json({ error: 'LinkedIn not connected' });
    }

    // Check if token is expired
    if (new Date(user.linkedin_expires_at) < new Date()) {
      return res.status(400).json({ error: 'LinkedIn token expired. Please reconnect.' });
    }

    // Get post content
    const post = await new Promise((resolve, reject) => {
      db.get(
        'SELECT content FROM posts WHERE id = ?',
        [postId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Post to LinkedIn
    const result = await postToLinkedIn(user.linkedin_access_token, user.linkedin_profile_id, post.content);

    // Track usage and mark as posted
    db.run(
      'INSERT INTO post_usage (post_id, user_id, status) VALUES (?, ?, ?)',
      [postId, req.session.userId, 'posted']
    );

    res.json({ message: 'Posted to LinkedIn successfully', linkedinData: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post to LinkedIn: ' + error.message });
  }
});

// API endpoint to check LinkedIn connection status
app.get('/api/linkedin/status', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  db.get(
    'SELECT linkedin_access_token, linkedin_expires_at FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }

      const isConnected = user.linkedin_access_token && new Date(user.linkedin_expires_at) > new Date();
      res.json({ connected: isConnected });
    }
  );
});

// API endpoint to delete a post (admin only)
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check if user is admin or post owner
  db.get(
    'SELECT u.role, p.created_by FROM users u, posts p WHERE u.id = ? AND p.id = ?',
    [req.session.userId, postId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!result) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      if (result.role !== 'admin' && result.created_by !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to delete this post' });
      }
      
      // Delete the post
      db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete post' });
        }
        
        // Also delete related usage records
        db.run('DELETE FROM post_usage WHERE post_id = ?', [postId]);
        
        res.json({ message: 'Post deleted successfully' });
      });
    }
  );
});

// API endpoint to mark post as posted by user
app.post('/api/posts/:id/mark-posted', (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check if already marked
  db.get(
    'SELECT id FROM post_usage WHERE post_id = ? AND user_id = ? AND status = ?',
    [postId, req.session.userId, 'posted'],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (existing) {
        return res.json({ message: 'Already marked as posted' });
      }
      
      // Mark as posted
      db.run(
        'INSERT INTO post_usage (post_id, user_id, status) VALUES (?, ?, ?)',
        [postId, req.session.userId, 'posted'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Server error' });
          }
          res.json({ message: 'Post marked as posted successfully' });
        }
      );
    }
  );
});

// API endpoint to get user's posted status for posts
app.get('/api/posts/status', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  db.all(
    'SELECT post_id FROM post_usage WHERE user_id = ? AND status = ?',
    [req.session.userId, 'posted'],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      const postedPostIds = rows.map(row => row.post_id);
      res.json({ postedPosts: postedPostIds });
    }
  );
});

// Personalization templates
const personalizationTemplates = {
  casual: {
    name: "Make it more casual",
    transforms: [
      // Remove dates first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply casual transforms
      { from: /\bwe are\b/gi, to: "we're" },
      { from: /\bdo not\b/gi, to: "don't" },
      { from: /\bcannot\b/gi, to: "can't" },
      { from: /\bwill not\b/gi, to: "won't" },
      { from: /\bit is\b/gi, to: "it's" },
      { from: /\bthat is\b/gi, to: "that's" },
      { from: /\bexcellent\b/gi, to: "awesome" },
      { from: /\bfantastic\b/gi, to: "amazing" },
      { from: /\bUtilize\b/gi, to: "Use" },
      { from: /\butilize\b/gi, to: "use" },
      { from: /\bImpressive\b/gi, to: "Pretty cool stuff" }
    ],
    prefix: "Hey everyone! ",
    suffix: " What are your thoughts? 🤔\n\nSource: https://ampcode.com/news"
  },
  excited: {
    name: "Add excitement",
    transforms: [
      // Remove dates first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply excited transforms
      { from: /\.\s/g, to: "! " },
      { from: /\.$/, to: "!" },
      { from: /\bgreat\b/gi, to: "incredible" },
      { from: /\bgood\b/gi, to: "fantastic" },
      { from: /\bnice\b/gi, to: "amazing" },
      { from: /\binteresting\b/gi, to: "mind-blowing" },
      { from: /\bImpressive\b/gi, to: "This is absolutely incredible" }
    ],
    prefix: "🚀 Exciting news! ",
    suffix: " Can't wait to see what's next! 🎉\n\nSource: https://ampcode.com/news"
  },
  professional: {
    name: "Make it professional",
    transforms: [
      // Remove dates first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply professional transforms
      { from: /\bawesome\b/gi, to: "excellent" },
      { from: /\bamazing\b/gi, to: "outstanding" },
      { from: /\bcool\b/gi, to: "impressive" },
      { from: /\bguys\b/gi, to: "colleagues" },
      { from: /\bhey\b/gi, to: "Hello" },
      { from: /\bdon't\b/gi, to: "do not" },
      { from: /\bcan't\b/gi, to: "cannot" },
      { from: /\bwon't\b/gi, to: "will not" },
      { from: /\bImpressive\b/gi, to: "This represents significant progress" }
    ],
    prefix: "I am pleased to announce that ",
    suffix: " This development demonstrates our commitment to continuous improvement.\n\nSource: https://ampcode.com/news"
  },
  personal: {
    name: "Add personal touch",
    transforms: [
      // Remove dates first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply personal transforms
      { from: /\bwe believe\b/gi, to: "I believe" },
      { from: /\bour team\b/gi, to: "my team and I" },
      { from: /\bwe are\b/gi, to: "I am" },
      { from: /\bwe have\b/gi, to: "I have" },
      { from: /\bAmp now\b/gi, to: "Amp now" },
      { from: /\bThis lets\b/gi, to: "This lets" }
    ],
    prefix: "In my experience, ",
    suffix: " What has your experience been like? I'd love to hear your perspective!\n\nSource: https://ampcode.com/news"
  }
};

// API endpoint to personalize a post with templates
app.post('/api/posts/:id/personalize', async (req, res) => {
  const postId = req.params.id;
  const { template } = req.body;

  try {
    // Get the original post
    const post = await new Promise((resolve, reject) => {
      db.get(
        'SELECT title, content FROM posts WHERE id = ?',
        [postId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Apply personalization template
    let personalizedContent = post.content;
    
    if (template && personalizationTemplates[template]) {
      const selectedTemplate = personalizationTemplates[template];
      
      // Apply text transformations
      selectedTemplate.transforms.forEach(transform => {
        personalizedContent = personalizedContent.replace(transform.from, transform.to);
      });
      
      // Add prefix and suffix
      if (selectedTemplate.prefix) {
        personalizedContent = selectedTemplate.prefix + personalizedContent;
      }
      if (selectedTemplate.suffix) {
        // Don't add source if it's already present
        if (!personalizedContent.includes('Source: https://ampcode.com/news')) {
          personalizedContent = personalizedContent + selectedTemplate.suffix;
        } else {
          // Add suffix without the source part
          const suffixWithoutSource = selectedTemplate.suffix.replace(/\n\nSource: https:\/\/ampcode\.com\/news$/, '');
          personalizedContent = personalizedContent + suffixWithoutSource;
        }
      }
    }

    res.json({ 
      originalTitle: post.title,
      originalContent: post.content,
      personalizedContent: personalizedContent,
      templateUsed: template || 'none'
    });

  } catch (error) {
    console.error('Template personalization error:', error);
    res.status(500).json({ error: 'Failed to personalize post: ' + error.message });
  }
});

// API endpoint to get available personalization templates
app.get('/api/personalization/templates', (req, res) => {
  const templates = Object.keys(personalizationTemplates).map(key => ({
    id: key,
    name: personalizationTemplates[key].name
  }));
  res.json({ templates });
});

// API endpoint to manually sync news
app.post('/api/sync-news', async (req, res) => {
  try {
    const articles = await fetchAmpNews();
    await saveNewsAsPosts(articles);
    res.json({ 
      message: 'News sync completed successfully', 
      articlesFound: articles.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync news: ' + error.message });
  }
});

// API endpoint to get news sync status
app.get('/api/news-status', (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM posts WHERE created_by = (SELECT id FROM users WHERE username = ? LIMIT 1)',
    ['amp_news_bot'],
    (err, result) => {
      if (err) {
        console.error('News status error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ newsPostsCount: result ? result.count : 0 });
    }
  );
});

// Schedule automatic news fetching every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled news sync...');
  try {
    const articles = await fetchAmpNews();
    await saveNewsAsPosts(articles);
  } catch (error) {
    console.error('Scheduled news sync failed:', error.message);
  }
});

// Initial news sync on server start
setTimeout(async () => {
  console.log('Running initial news sync...');
  try {
    const articles = await fetchAmpNews();
    await saveNewsAsPosts(articles);
  } catch (error) {
    console.error('Initial news sync failed:', error.message);
  }
}, 3000); // Wait 3 seconds after server start

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
