# 🔒 Security Guidelines

## ⚠️ IMPORTANT: Environment Variables

This project uses sensitive API keys and credentials that **MUST NOT** be committed to version control.

### 🔐 Setup Instructions

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values in `.env`:**
   - `LINKEDIN_CLIENT_ID` - Your LinkedIn app client ID
   - `LINKEDIN_CLIENT_SECRET` - Your LinkedIn app client secret  
   - `CLAUDE_API_KEY` - Your Claude API key (optional)
   - `SESSION_SECRET` - A random secret for session encryption

3. **Never commit `.env` to git** - it's already in `.gitignore`

### 🚨 Security Checklist

- [ ] ✅ `.env` file is in `.gitignore`
- [ ] ✅ No API keys in source code
- [ ] ✅ No credentials in documentation
- [ ] ✅ Database files are ignored
- [ ] ✅ Only `.env.example` is committed (with placeholder values)

### 🔑 Where to Get API Keys

#### LinkedIn OAuth:
1. Go to: https://www.linkedin.com/developers/apps
2. Create a new app
3. Get Client ID and Client Secret
4. Set redirect URI to: `http://localhost:3000/auth/linkedin/callback`

#### Claude API (Optional):
1. Go to: https://console.anthropic.com/account/keys
2. Create a new API key
3. Add billing information
4. Copy the key (starts with `sk-ant-`)

### 🛡️ Production Security

For production deployment:

- Use environment variables provided by your hosting platform
- Never store secrets in code or config files
- Use strong, unique session secrets
- Enable HTTPS
- Regularly rotate API keys
- Monitor for leaked credentials

### 🚨 If You Accidentally Commit Secrets

1. **Immediately rotate all exposed credentials**
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push to remote (if already pushed)**
4. **Notify team members to re-clone the repository**

### 📞 Security Contact

If you discover a security vulnerability, please contact the maintainer immediately.
