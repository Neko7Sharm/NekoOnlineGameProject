const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'neko_super_secret_key_2026';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();
      
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ username, password: hashedPassword })
      .select()
      .single();
      
    if (insertError) {
      throw insertError;
    }
    
    // Generate token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();
      
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware to verify token (can be moved to a separate middleware folder later)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = { router, authMiddleware };
