const User = require('../models/User');
const emailService = require('../services/emailService');

// Register new user
const register = async (req, res) => {
  const { username, password, email } = req.body;
  
  try {
    const user = await User.create(username, password, email);
    
    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    res.json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Username or email already exists' });
  }
};

// Login user
const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findByUsername(username);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await User.verifyPassword(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Logout user
const logout = (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
};

// LinkedIn OAuth callback handler
const linkedinCallback = (req, res) => {
  // Store user in session
  req.session.userId = req.user.id;
  req.session.username = req.user.username;
  req.session.role = req.user.role;
  req.session.linkedinConnected = true;
  
  res.redirect('/dashboard');
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  
  try {
    const resetData = await User.createPasswordResetToken(email);
    
    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetData.token, resetData.username);
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
  } catch (error) {
    if (error.message === 'User not found') {
      // Don't reveal if email exists for security
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    const result = await User.resetPassword(token, newPassword);
    res.json({ message: 'Password reset successfully', username: result.username });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Verify reset token (for UI validation)
const verifyResetToken = async (req, res) => {
  const { token } = req.params;
  
  try {
    const tokenData = await User.verifyResetToken(token);
    if (tokenData) {
      res.json({ valid: true, email: tokenData.email });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    res.json({ valid: false });
  }
};

// Forgot username
const forgotUsername = async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await User.findByEmail(email);
    if (user) {
      // Send username reminder email
      try {
        await emailService.sendUsernameReminder(email, user.username);
        res.json({ message: 'If that email exists, the username has been sent.' });
      } catch (emailError) {
        console.error('Failed to send username reminder email:', emailError);
        res.json({ message: 'If that email exists, the username has been sent.' });
      }
    } else {
      res.json({ message: 'If that email exists, the username has been sent.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  linkedinCallback,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  forgotUsername
};
