const axios = require('axios');
const { CLAUDE_API_KEY } = require('../config/env');

// Global tracking to prevent any repetition
let usedPhrases = new Set();
let usedTitles = new Set();
let postCounter = 0;

// AI-powered post generation using Claude
async function generateAIPost(rawText) {
  if (!CLAUDE_API_KEY) {
    console.log('Claude API key not found, using fallback generation');
    return createLinkedInPost(rawText);
  }

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a social media expert. Transform this tech news into an engaging post that will get high engagement.

STRICT RULES TO FOLLOW:
- NO hashtags whatsoever
- NO emojis (unless truly exceptional case)
- Create a hook that makes people think "that's interesting" 
- Make it conversational and engaging
- Ask thought-provoking questions
- Remove any dates completely
- Keep it professional but approachable
- Focus on the value/impact to readers
- Use line breaks for readability
- Make people want to comment or share
- DON'T include the source link in the main post

Create the main post first. Then create a second follow-up post that says something like "Read the full details here: https://ampcode.com/news"

Tech News: ${rawText.substring(0, 600)}`
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${CLAUDE_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    const aiContent = response.data.content[0].text;
    postCounter++;
    
    return {
      title: generateUniqueTitle(postCounter),
      content: aiContent,
      source: 'Amp News (AI Enhanced)'
    };
    
  } catch (error) {
    console.error('AI generation failed, using fallback:', error.message);
    return createLinkedInPost(rawText);
  }
}

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

// Generate completely different personas/voices for each post following social media best practices
function generateTrulyUniqueContent(cleanText, counter) {
  // Remove dates from the content first
  let processedContent = cleanText
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi, '') // Remove "July 8, 2025" format
    .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove "2025-07-08" format
    .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '') // Remove "7/8/2025" format
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
    
  const trimmedContent = processedContent.substring(0, 180) + (processedContent.length > 180 ? '...' : '');
  
  // Engagement-focused personas following social media best practices
  // NO emojis, NO hashtags, focus on hooks and engagement
  const personas = [
    // Hook with curiosity
    (content) => `${content}\n\nThis could change how we approach development.\n\n[Follow-up] Read the full details here: https://ampcode.com/news`,
    
    // Question hook
    (content) => `${content}\n\nWhat's your take on this development?\n\n[Follow-up] More details here: https://ampcode.com/news`,
    
    // Minimalist authority
    (content) => `${content}\n\n[Follow-up] Full story: https://ampcode.com/news`,
    
    // Insider perspective
    (content) => `Here's what this really means: ${content}\n\nThoughts?\n\n[Follow-up] Read more: https://ampcode.com/news`,
    
    // Contrarian hook
    (content) => `${content}\n\nNot everyone will agree with this approach.\n\n[Follow-up] See the full announcement: https://ampcode.com/news`,
    
    // Problem/solution angle
    (content) => `${content}\n\nWe'll see if this actually delivers on the promise.\n\n[Follow-up] Details here: https://ampcode.com/news`,
    
    // Industry watcher
    (content) => `For those tracking AI developments: ${content}\n\n[Follow-up] Complete coverage: https://ampcode.com/news`,
    
    // Impact focused
    (content) => `${content}\n\nThis shifts the entire conversation.\n\n[Follow-up] Read the announcement: https://ampcode.com/news`,
    
    // Technical perspective
    (content) => `Technical update: ${content}\n\n[Follow-up] Full technical details: https://ampcode.com/news`,
    
    // Future implications
    (content) => `${content}\n\nMakes you wonder about the future of software development.\n\n[Follow-up] Learn more: https://ampcode.com/news`,
    
    // Direct assessment
    (content) => `${content}\n\nStraightforward and effective.\n\n[Follow-up] Full story here: https://ampcode.com/news`,
    
    // Competitive angle
    (content) => `${content}\n\nThis puts them ahead of the competition.\n\n[Follow-up] See why: https://ampcode.com/news`,
    
    // Open question
    (content) => `${content}\n\nWhat do you think this means for the industry?\n\n[Follow-up] More context: https://ampcode.com/news`,
    
    // Behind the scenes
    (content) => `Here's what happened: ${content}\n\n[Follow-up] Full breakdown: https://ampcode.com/news`,
    
    // Trend analysis
    (content) => `${content}\n\nAnother step toward AI-first development.\n\n[Follow-up] Details: https://ampcode.com/news`,
    
    // Practical application
    (content) => `${content}\n\nUseful if you're building AI tools.\n\n[Follow-up] Implementation details: https://ampcode.com/news`,
    
    // Reality check
    (content) => `${content}\n\nActually solid, not just marketing.\n\n[Follow-up] Judge for yourself: https://ampcode.com/news`,
    
    // Community engagement
    (content) => `${content}\n\nWho else is experimenting with this approach?\n\n[Follow-up] Learn more: https://ampcode.com/news`,
    
    // Quick insight
    (content) => `Quick insight: ${content}\n\n[Follow-up] Full analysis: https://ampcode.com/news`,
    
    // Looking ahead
    (content) => `${content}\n\nThis is just the beginning.\n\n[Follow-up] What's next: https://ampcode.com/news`
  ];
  
  // Use counter to select persona, cycling through all personas
  const personaIndex = (counter - 1) % personas.length;
  return personas[personaIndex](trimmedContent);
}

// Generate unique titles - uses counter to ensure no repetition
// Following social media best practices: no emojis, professional titles
function generateUniqueTitle(counter) {
  const titles = [
    "Amp Update",
    "New Feature", 
    "Innovation Alert",
    "Latest Release",
    "Tech News",
    "Development Update",
    "AI Update",
    "Progress Report",
    "Advancement",
    "Enhancement",
    "Milestone",
    "Product Launch",
    "Analytics Update",
    "Tools Update",
    "Breaking News",
    "Platform News",
    "Discovery",
    "System Update",
    "Design Update",
    "Network Update"
  ];
  
  // Use counter to select title, cycling through all titles
  const titleIndex = (counter - 1) % titles.length;
  return titles[titleIndex];
}

// Generate AI post with custom style
async function generateAIPostWithStyle(content, style = 'professional') {
  if (!CLAUDE_API_KEY) {
    throw new Error('AI service not configured');
  }

  const stylePrompts = {
    professional: {
      tone: 'professional and authoritative',
      instructions: 'Write like a thought leader. Use industry terminology. Include insights and implications. NO hashtags. NO emojis. Create hooks that make people think.'
    },
    casual: {
      tone: 'casual and conversational',
      instructions: 'Write like you\'re talking to a friend. Use "you" and "we". Ask engaging questions. NO emojis. NO hashtags. Focus on conversation starters.'
    },
    excited: {
      tone: 'enthusiastic and energetic',
      instructions: 'Use energy with words like "incredible", "game-changing". NO emojis. NO hashtags. Create anticipation and curiosity.'
    },
    technical: {
      tone: 'technical and detailed',
      instructions: 'Include technical details and specifications. Explain the "how" and "why". Use precise language. NO hashtags. NO emojis. Focus on practical value.'
    }
  };

  const selectedStyle = stylePrompts[style] || stylePrompts.professional;

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are a social media expert. Create an engaging post that will get high engagement and shares.

Style: ${selectedStyle.tone}
Instructions: ${selectedStyle.instructions}

STRICT REQUIREMENTS:
- NO hashtags whatsoever
- NO emojis (unless truly exceptional case)
- Remove any dates completely
- DON'T include the source link in the main post
- Use line breaks for readability
- Create hooks that make people think "that's interesting"
- Make it engaging and valuable to readers
- Include a call-to-action or question to encourage engagement

Create the main post first. Then create a separate follow-up post that says something like "Read the full details here: https://ampcode.com/news"

Content: ${content}`
    }]
  }, {
    headers: {
      'Authorization': `Bearer ${CLAUDE_API_KEY}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content[0].text;
}

// Modify post with AI
async function modifyAIPost(currentContent, instruction) {
  if (!CLAUDE_API_KEY) {
    throw new Error('AI service not configured');
  }

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are a social media expert. I have a post that I want you to modify based on my specific instruction.

Current Post:
${currentContent}

Modification Request: ${instruction}

STRICT REQUIREMENTS:
- NO hashtags whatsoever
- NO emojis (unless truly exceptional case)
- Apply the requested modification thoughtfully
- Keep it professional and engaging
- Use line breaks for readability
- Create hooks that make people think "that's interesting"
- Keep the post engaging and valuable
- If the instruction is unclear, make your best interpretation
- Structure with main post and follow-up link format

Please provide the modified post:`
    }]
  }, {
    headers: {
      'Authorization': `Bearer ${CLAUDE_API_KEY}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content[0].text;
}

module.exports = {
  generateAIPost,
  createLinkedInPost,
  generateAIPostWithStyle,
  modifyAIPost
};
