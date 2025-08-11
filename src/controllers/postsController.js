const Post = require('../models/Post');
const PostUsage = require('../models/PostUsage');
const Scoring = require('../models/Scoring');
const User = require('../models/User');
const { postToLinkedIn } = require('../services/linkedinService');
const { generateAIPostWithStyle, modifyAIPost } = require('../services/aiService');
const { personalizationTemplates } = require('../config/templates');
const { PaginationHelper } = require('../utils/pagination');
const { pooledQuery } = require('../config/database');
const { JobManager, JobTracker } = require('../jobs/processors');
const { apiLogger } = require('../config/logger');

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts with pagination
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/OrderParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 */
const getAllPosts = async (req, res) => {
  try {
    // Simple approach to get posts working quickly
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const posts = await Post.getAll(limit, offset);
    
    apiLogger.info('Posts retrieved', {
      userId: req.session?.userId,
      count: posts.length,
    });

    res.json({ 
      posts: posts,
      pagination: {
        total_items: posts.length,
        page: 1,
        limit: limit
      }
    });
  } catch (error) {
    apiLogger.error('Failed to get posts', { error: error.message });
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// Create new post
const createPost = async (req, res) => {
  const { title, content, image_url } = req.body;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const post = await Post.create(title, content, image_url, req.session.userId);
    res.json({ message: 'Post created successfully', postId: post.id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Track post usage
const usePost = async (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    await PostUsage.track(postId, req.session.userId);
    res.json({ message: 'Post usage tracked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Post to LinkedIn
const postToLinkedInEndpoint = async (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get user's LinkedIn token
    const { connected, user } = await User.getLinkedInStatus(req.session.userId);
    
    if (!connected) {
      return res.status(400).json({ error: 'LinkedIn not connected or token expired. Please reconnect.' });
    }

    // Get post content
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Post to LinkedIn
    const result = await postToLinkedIn(user.linkedin_access_token, user.linkedin_profile_id, post.content);

    // Track usage and mark as posted
    await PostUsage.track(postId, req.session.userId, 'posted');
    
    // Process scoring for the post
    const scoringResult = await Scoring.processPostScoring(req.session.userId, postId);
    console.log('Scoring result:', scoringResult);

    res.json({ message: 'Posted to LinkedIn successfully', linkedinData: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post to LinkedIn: ' + error.message });
  }
};

// Mark post as posted
const markPosted = async (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const isAlreadyPosted = await PostUsage.isPosted(postId, req.session.userId);
    
    if (isAlreadyPosted) {
      return res.json({ message: 'Already marked as posted' });
    }
    
    // Mark as posted
    await PostUsage.track(postId, req.session.userId, 'posted');
    
    // Process scoring for the post
    const scoringResult = await Scoring.processPostScoring(req.session.userId, postId);
    
    res.json({ 
      message: 'Post marked as posted successfully',
      scoring: scoringResult
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's posted status for posts
const getPostsStatus = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const postedPostIds = await PostUsage.getUserPostedPosts(req.session.userId);
    res.json({ postedPosts: postedPostIds });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update post
const updatePost = async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    // Check if user is admin or post owner
    const user = await User.findById(req.session.userId);
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Allow edit if admin, owner, or system-generated news post
    let canEdit = (user && user.role === 'admin') || (post.created_by === req.session.userId);

    if (!canEdit) {
      // Check if this post was created by the system news bot
      try {
        const systemUser = await User.findByUsername('amp_news_bot');
        if (systemUser && post.created_by === systemUser.id) {
          canEdit = true;
        }
      } catch (_) {
        // ignore lookup error and fall through
      }
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }
    
    // Update the post
    const updated = await Post.update(postId, content.trim());
    
    if (!updated) {
      return res.status(404).json({ error: 'Post not found or no changes made' });
    }
    
    apiLogger.info('Post updated', {
      userId: req.session.userId,
      postId: postId,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    apiLogger.error('Post update failed', {
      userId: req.session.userId,
      postId: postId,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// Delete post
const deletePost = async (req, res) => {
  const postId = req.params.id;
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Check if user is admin or post owner
    const user = await User.findById(req.session.userId);
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (user.role !== 'admin' && post.created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }
    
    // Delete the post
    await Post.delete(postId);
    
    // Also delete related usage records
    await PostUsage.deleteByPostId(postId);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Personalize post with templates
const personalizePost = async (req, res) => {
  const postId = req.params.id;
  const { template } = req.body;

  try {
    // Get the original post
    const post = await Post.findById(postId);

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
};

/**
 * @swagger
 * /api/posts/generate-ai:
 *   post:
 *     summary: Generate AI post (async)
 *     tags: [Posts, AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content: { type: string, example: "Write about AI trends" }
 *               style: { type: string, enum: ['professional', 'casual', 'technical'], default: 'professional' }
 *     responses:
 *       202:
 *         description: AI generation job started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId: { type: string, example: "12345" }
 *                 message: { type: string, example: "AI generation started" }
 *                 statusUrl: { type: string, example: "/api/jobs/ai/12345/status" }
 */
const generateAI = async (req, res) => {
  const { content, style = 'professional' } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Start async AI generation job
    const jobId = await JobManager.addAIGenerationJob(
      'post',
      content,
      { style },
      req.session.userId
    );

    apiLogger.info('AI generation job started', {
      jobId,
      userId: req.session.userId,
      style,
    });
    
    res.status(202).json({ 
      jobId,
      message: 'AI generation started',
      statusUrl: `/api/jobs/ai/${jobId}/status`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    apiLogger.error('Failed to start AI generation job', {
      error: error.message,
      userId: req.session.userId,
    });
    res.status(500).json({ error: 'Failed to start AI generation: ' + error.message });
  }
};

// Modify post with AI
const modifyAI = async (req, res) => {
  const postId = req.params.id;
  const { instruction, currentContent } = req.body;
  
  if (!instruction) {
    return res.status(400).json({ error: 'Modification instruction is required' });
  }

  try {
    const modifiedContent = await modifyAIPost(currentContent, instruction);
    
    res.json({ 
      modifiedContent: modifiedContent,
      instruction: instruction,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI modification error:', error.message);
    res.status(500).json({ error: 'Failed to modify post: ' + error.message });
  }
};

// Get personalization templates
const getTemplates = (req, res) => {
  const templates = Object.keys(personalizationTemplates).map(key => ({
    id: key,
    name: personalizationTemplates[key].name
  }));
  res.json({ templates });
};

module.exports = {
  getAllPosts,
  createPost,
  updatePost,
  usePost,
  postToLinkedInEndpoint,
  markPosted,
  getPostsStatus,
  deletePost,
  personalizePost,
  generateAI,
  modifyAI,
  getTemplates
};
