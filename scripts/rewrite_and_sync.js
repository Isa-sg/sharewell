#!/usr/bin/env node

const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure root dir resolution for requires
require('module').Module._initPaths && require('module').Module._initPaths();

const Post = require('../src/models/Post');
const { fetchAmpNews } = require('../src/services/newsService');
const { generateUncutPost } = require('../src/services/aiService');

(async () => {
  try {
    console.log('Rewriting all posts to concise format (<=280 chars, no emojis/hashtags)...');
    const batchSize = 200;
    let offset = 0;
    let totalUpdated = 0;

    // Fetch in batches until no more posts
    while (true) {
      const posts = await Post.getAll(batchSize, offset);
      if (!posts || posts.length === 0) break;

      for (const p of posts) {
        const source = p.content && p.content.length > 0 ? p.content : (p.title || '');
        const newContent = generateUncutPost(source);
        if (newContent && newContent !== p.content) {
          await Post.update(p.id, newContent);
          totalUpdated++;
        }
      }

      if (posts.length < batchSize) break;
      offset += batchSize;
    }

    console.log(`Rewrote ${totalUpdated} posts.`);

    console.log('Syncing new news posts...');
    const articles = await fetchAmpNews();
    // Ensure uncut format for incoming articles as well (defensive)
    const normalized = (articles || []).map(a => ({
      title: a.title || 'Amp Update',
      content: generateUncutPost(a.content || a.title || ''),
      source: 'Amp News (Uncut)'
    }));
    await Post.saveNewsAsPosts(normalized);

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Rewrite and sync failed:', err);
    process.exit(1);
  }
})();
