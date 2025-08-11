const axios = require('axios');
const cheerio = require('cheerio');
const { generateUncutPost } = require('./aiService');

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
    
    for (let index = 0; index < Math.min(newsItems.length, 8); index++) {
      const element = newsItems[index];
      const $element = $(element);
      const text = $element.text().trim();
      
      if (text.length > 50) { // Process items with sufficient content
        const processedPost = { title: 'Amp Update', content: generateUncutPost(text), source: 'Amp News (Uncut)' };
        if (processedPost) {
          articles.push(processedPost);
        }
      }
    }
    
    console.log(`Found ${articles.length} news articles`);
    return articles;
    
  } catch (error) {
    console.error('Error fetching Amp news:', error.message);
    // Return some sample news if scraping fails
    return [{
      title: 'Setup Complete',
      content: `Just set up this LinkedIn Content Distributor and it's working perfectly.

Automatically pulls the latest Amp news and formats it for social media posting.

No more copying and pasting from news sites or trying to make boring updates sound interesting.

Who else struggles with keeping their social feeds fresh with tech updates?

[Follow-up] Learn more about the setup: https://ampcode.com/news`,
      source: 'System'
    }];
  }
}

// Helper function to extract keywords
function extractKeywords(text) {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'an', 'have', 'it', 'in', 'you', 'that', 'he', 'was', 'for', 'of', 'with', 'his', 'they', 'i', 'be', 'this', 'from', 'or', 'had', 'by', 'not', 'word', 'but', 'what', 'some', 'we', 'can', 'out', 'other', 'were', 'all', 'there', 'when', 'up', 'use', 'your', 'how', 'said', 'each', 'she', 'do', 'now', 'has', 'her', 'its', 'would', 'about', 'if', 'who', 'oil', 'sit', 'now'];
  return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 5);
}

module.exports = {
  fetchAmpNews,
  extractKeywords
};
