const passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const User = require('../models/User');
const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI } = require('../config/env');

// LinkedIn OAuth Strategy - only configure if credentials are provided
if (LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET && LINKEDIN_REDIRECT_URI) {
  passport.use(new LinkedInStrategy({
    clientID: LINKEDIN_CLIENT_ID,
    clientSecret: LINKEDIN_CLIENT_SECRET,
    callbackURL: LINKEDIN_REDIRECT_URI,
    scope: ['r_liteprofile'],
    state: true,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with LinkedIn ID
      const existingUser = await User.findByLinkedInId(profile.id);
      
      if (existingUser) {
        // Update existing user's LinkedIn token
        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days expiry
        await User.updateLinkedInToken(existingUser.id, accessToken, expiresAt);
        return done(null, existingUser);
      } else {
        // Create new user with LinkedIn profile
        const newUser = await User.createFromLinkedIn(profile, accessToken);
        return done(null, newUser);
      }
    } catch (error) {
      return done(error);
    }
  }));
} else {
  console.log('LinkedIn OAuth not configured - missing credentials');
}

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
