const express = require('express');
const {
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
} = require('../controllers/postsController');

const router = express.Router();

// Posts CRUD
router.get('/', getAllPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

// Post usage tracking
router.post('/:id/use', usePost);
router.post('/:id/mark-posted', markPosted);
router.get('/status', getPostsStatus);

// LinkedIn posting
router.post('/:id/linkedin', postToLinkedInEndpoint);

// Post personalization
router.post('/:id/personalize', personalizePost);
router.get('/personalization/templates', getTemplates);

// AI features
router.post('/generate-ai', generateAI);
router.post('/:id/modify-ai', modifyAI);

module.exports = router;
