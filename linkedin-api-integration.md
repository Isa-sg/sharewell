# LinkedIn API Integration Guide

## Overview
This guide explains how to integrate LinkedIn API for direct posting from your content distribution system.

## Current Status
Your current system uses LinkedIn's sharing URLs (`https://www.linkedin.com/sharing/share-offsite/`) which redirects users to LinkedIn's web interface. For full automation, you'll need the LinkedIn Share API.

## LinkedIn API Setup

### 1. Create LinkedIn App
1. Go to https://www.linkedin.com/developers/apps/new
2. Fill in application details:
   - App name: "LinkedIn Content Distributor"
   - Company: Your company name
   - Privacy policy URL (required)
   - App logo (optional)
3. Review and create the app

### 2. Required Permissions
For posting content, you need:
- **`w_member_social`** - Post on behalf of individual members
- **`w_organization_social`** - Post on behalf of company pages (requires admin role)

### 3. OAuth 2.0 Setup
Add these environment variables to your project:

```javascript
// Add to server.js
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';
```

### 4. Database Schema Updates
Add LinkedIn integration fields:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN linkedin_access_token TEXT;
ALTER TABLE users ADD COLUMN linkedin_profile_id TEXT;
ALTER TABLE users ADD COLUMN linkedin_expires_at DATETIME;

-- New table for LinkedIn company pages
CREATE TABLE linkedin_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    access_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Steps

### 1. Install Additional Dependencies
```bash
npm install passport passport-linkedin-oauth2 axios
```

### 2. Add OAuth Routes
```javascript
// Add to server.js
const passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

passport.use(new LinkedInStrategy({
    clientID: LINKEDIN_CLIENT_ID,
    clientSecret: LINKEDIN_CLIENT_SECRET,
    callbackURL: LINKEDIN_REDIRECT_URI,
    scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
}, (accessToken, refreshToken, profile, done) => {
    // Store LinkedIn access token in database
    // Link to existing user account
    return done(null, { profile, accessToken });
}));

// OAuth routes
app.get('/auth/linkedin', passport.authenticate('linkedin'));
app.get('/auth/linkedin/callback', 
    passport.authenticate('linkedin'), 
    (req, res) => {
        // Handle successful authentication
        res.redirect('/dashboard');
    }
);
```

### 3. Direct Posting Function
```javascript
// Add to server.js
async function postToLinkedIn(accessToken, content, imageUrl = null) {
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

    if (imageUrl) {
        // Add image handling logic
        shareData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        // Additional image upload logic required
    }

    const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        shareData,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data;
}
```

### 4. Update Frontend
Add LinkedIn integration buttons to your dashboard:

```html
<!-- Add to dashboard.html -->
<div class="linkedin-integration">
    <button onclick="connectLinkedIn()">Connect LinkedIn</button>
    <button onclick="postDirectly()" class="hidden" id="directPostBtn">Post Directly to LinkedIn</button>
</div>
```

## API Limitations & Considerations

### Rate Limits
- LinkedIn has strict rate limits
- Implement exponential backoff for failed requests
- Consider queueing posts for batch processing

### Content Restrictions
- Maximum 3,000 characters per post
- No duplicate content (same post within 24 hours)
- Image uploads require additional Media Upload API calls

### Compliance
- Must comply with LinkedIn API Terms of Use
- Respect user privacy and data handling requirements
- Implement proper error handling and logging

## Testing Your Integration

### 1. Test Environment
- Use LinkedIn's sandbox environment initially
- Test with personal accounts before company accounts

### 2. Error Handling
```javascript
// Add robust error handling
try {
    const result = await postToLinkedIn(accessToken, content);
    console.log('Posted successfully:', result);
} catch (error) {
    if (error.response?.status === 401) {
        // Token expired, refresh needed
    } else if (error.response?.status === 429) {
        // Rate limit exceeded
    }
    console.error('LinkedIn API Error:', error.response?.data);
}
```

## Security Best Practices

1. **Store tokens securely** - encrypt access tokens in database
2. **Use HTTPS** - required for OAuth callbacks
3. **Implement token refresh** - LinkedIn tokens expire
4. **Validate permissions** - check user has granted required scopes
5. **Log API calls** - for debugging and compliance

## Next Steps

1. Create LinkedIn Developer account
2. Register your application
3. Implement OAuth flow
4. Add database schema updates
5. Test with personal LinkedIn account
6. Deploy and test with team members

## Resources

- [LinkedIn Share API Documentation](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [LinkedIn Developer Portal](https://developer.linkedin.com/)
- [OAuth 2.0 Implementation Guide](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
