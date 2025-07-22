# LinkedIn API Setup Guide

To enable LinkedIn OAuth login and direct posting, you need to create a LinkedIn app and get your API credentials.

## Step 1: Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps/new
2. Fill in your application details:
   - **App name**: "LinkedIn Content Distributor"
   - **LinkedIn Company**: Select your company
   - **Privacy policy URL**: You can use a placeholder like `http://localhost:3000/privacy`
   - **App logo**: Upload a logo (optional)
3. Click "Create app"

## Step 2: Configure OAuth Settings

1. In your app dashboard, go to the "Auth" tab
2. Add these redirect URLs:
   - `http://localhost:3000/auth/linkedin/callback` (for development)
   - `https://yourdomain.com/auth/linkedin/callback` (for production)

## Step 3: Get API Credentials

1. In the "Auth" tab, you'll see:
   - **Client ID**: Copy this value
   - **Client Secret**: Copy this value (keep it secret!)

## Step 4: Configure Your App

1. Open the `.env` file in your project
2. Replace the placeholder values:

```env
LINKEDIN_CLIENT_ID=your_actual_client_id_here
LINKEDIN_CLIENT_SECRET=your_actual_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

## Step 5: Request API Access

LinkedIn requires approval for certain API features:

1. In your app dashboard, go to "Products"
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect** (for login)
   - **Share on LinkedIn** (for posting)
   - **Marketing Developer Platform** (if needed)

**Note**: LinkedIn approval can take several days to weeks.

## Step 6: Test Your Integration

1. Restart your server: `npm start`
2. Go to `http://localhost:3000`
3. Click "Continue with LinkedIn"
4. Authorize your app
5. You should be redirected to the dashboard
6. Try posting to LinkedIn from the dashboard

## Important Notes

### Rate Limits
- LinkedIn has strict rate limits
- Personal profiles: 100 posts per day
- Company pages: 20 posts per day

### API Versions
- This implementation uses LinkedIn API v2
- Some features may require specific API versions

### Content Restrictions
- Maximum 3,000 characters per post
- No duplicate content within 24 hours
- Images require separate upload process

### Security
- Never commit your `.env` file to version control
- Use environment variables in production
- Implement proper error handling

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check that your redirect URI matches exactly in LinkedIn app settings
   - Make sure URL is accessible (no typos)

2. **"Insufficient privileges"**
   - Your app needs approval for "Share on LinkedIn" product
   - Check app status in LinkedIn Developer Portal

3. **"Token expired"**
   - LinkedIn tokens expire after 60 days
   - Users need to reconnect their accounts

4. **"Rate limit exceeded"**
   - Wait before making more API calls
   - Implement exponential backoff

### Development Mode

For testing without LinkedIn approval:
1. The app will work with "Sign In with LinkedIn" only
2. Direct posting will fail until "Share on LinkedIn" is approved
3. Use the manual "Open LinkedIn" button as fallback

## Production Deployment

1. Update redirect URI in LinkedIn app settings
2. Set production environment variables
3. Use HTTPS (required for OAuth)
4. Implement proper logging and monitoring

## Support

- LinkedIn API Documentation: https://docs.microsoft.com/en-us/linkedin/
- LinkedIn Developer Portal: https://developer.linkedin.com/
- API Status: https://linkedin.statuspage.io/
