// Test script to verify Claude API integration
require('dotenv').config();
const axios = require('axios');

async function testClaudeAPI() {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    console.log('🔍 Checking Claude API configuration...\n');
    
    if (!CLAUDE_API_KEY) {
        console.log('❌ CLAUDE_API_KEY not found in .env file');
        console.log('👉 Add this line to your .env file:');
        console.log('   CLAUDE_API_KEY=sk-ant-your-actual-key-here\n');
        return;
    }
    
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
        console.log('⚠️  API key format looks incorrect');
        console.log('   Claude API keys should start with "sk-ant-"\n');
        return;
    }
    
    console.log('✅ API key found and formatted correctly');
    console.log('🧪 Testing API connection...\n');
    
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Say "Hello from Claude API!" and nothing else.'
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${CLAUDE_API_KEY}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        console.log('🎉 SUCCESS! Claude API is working');
        console.log('📝 Response:', response.data.content[0].text);
        console.log('\n✅ Your LinkedIn AI features are ready to use!\n');
        
        // Test the local endpoint
        console.log('🧪 Testing local AI endpoint...');
        const localTest = await axios.post('http://localhost:3000/api/posts/generate-ai', {
            content: 'Test news: Amp adds new AI features',
            style: 'excited'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('🎉 Local endpoint working!');
        console.log('📝 Generated content preview:', localTest.data.generatedContent.substring(0, 100) + '...\n');
        
    } catch (error) {
        console.log('❌ API test failed');
        if (error.response) {
            console.log('Error status:', error.response.status);
            console.log('Error details:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n💡 This usually means:');
                console.log('   - Invalid API key');
                console.log('   - API key not activated');
                console.log('   - Billing not set up');
            }
        } else {
            console.log('Error:', error.message);
        }
        console.log('\n👉 Double-check your API key at: https://console.anthropic.com/\n');
    }
}

testClaudeAPI();
