# AI-Powered LinkedIn Content Generator Setup

## 🤖 What's New

Your LinkedIn Content Distributor now has AI superpowers! You can generate intelligent, engaging posts using Claude AI.

## 🚀 Features Added

### 1. **AI Post Generation**
- Choose from 4 writing styles: Professional, Casual, Excited, Technical
- AI removes dates automatically and adds proper source attribution
- Generates unique, engaging content from raw news data

### 2. **Smart UI Integration**
- New "🤖 Generate AI Version" button in each post modal
- Style selection dropdown
- Side-by-side comparison with original content
- One-click copy and use functionality

### 3. **Fallback System**
- Works without AI (uses original persona system)
- Graceful error handling
- No disruption to existing functionality

## 🔧 Setup Instructions

### Step 1: Get Claude API Key
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Configure Environment
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Claude API key:
   ```
   CLAUDE_API_KEY=sk-ant-your-actual-key-here
   ```

### Step 3: Restart Server
```bash
npm start
```

## 📖 How to Use

### For Individual Posts:
1. Click any post in your dashboard
2. Click "🤖 Generate AI Version"
3. Choose your preferred writing style
4. Click "Generate AI Version"
5. Review the AI-generated content
6. Use it directly or copy to clipboard

### For Automatic AI Enhancement:
- All new posts fetched from ampcode.com/news will automatically try AI generation
- Falls back to original persona system if AI is unavailable

## 🎯 API Endpoints

### Generate AI Post
```bash
POST /api/posts/generate-ai
Content-Type: application/json

{
  "content": "Your raw content here",
  "style": "professional" // professional, casual, excited, technical
}
```

### Response
```json
{
  "generatedContent": "AI-enhanced LinkedIn post",
  "style": "professional",
  "timestamp": "2025-01-22T..."
}
```

## 💡 Tips for Best Results

### Content Style Guide:
- **Professional**: Best for company announcements, technical updates
- **Casual**: Great for team updates, behind-the-scenes content
- **Excited**: Perfect for product launches, major milestones
- **Technical**: Ideal for developer-focused content, technical deep-dives

### Best Practices:
1. Review AI-generated content before posting
2. Customize the AI output if needed
3. Test different styles for the same content
4. Use the original persona system as backup

## 🔒 Privacy & Security

- API calls are made server-side only
- No content is stored by Anthropic beyond the API call
- Your Claude API key is kept secure in environment variables
- All features work without AI if you prefer

## 🛠️ Troubleshooting

### "AI service not configured" error:
- Check your `.env` file has `CLAUDE_API_KEY`
- Restart the server after adding the key
- Verify the API key is valid on Anthropic console

### API rate limits:
- Claude Haiku has generous rate limits
- The system falls back to persona generation automatically
- Consider upgrading your Anthropic plan for higher usage

### Network errors:
- Check your internet connection
- Verify Anthropic API is accessible
- The system will use fallback generation automatically

## 🚀 Advanced Usage

### Custom Prompts:
You can modify the AI prompts in `server.js` around line 170-190 to customize:
- Writing tone
- Content structure
- Hashtag usage
- Call-to-action style

### Multiple AI Models:
Change the model in `server.js`:
```javascript
model: 'claude-3-haiku-20240307'  // Fast & efficient
// or
model: 'claude-3-sonnet-20240229'  // More sophisticated
```

## 📊 Monitoring

Watch the server logs to see:
- AI generation success/failure
- Fallback usage
- API response times

```bash
tail -f server.log  # If you're logging to file
```

Enjoy your AI-powered LinkedIn content! 🎉
