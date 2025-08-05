const User = require('../models/User');

// Register new user
const register = async (req, res) => {
  const { username, password, email } = req.body;
  
  try {
    const user = await User.create(username, password, email);
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

module.exports = {
  register,
  login,
  logout,
  linkedinCallback
};
