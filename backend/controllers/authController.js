const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const authController = {
  signup: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: 'User already exists' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({ name, email, password: hashedPassword });
      await user.save();

      const token = generateToken(user);
      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, coins: user.coins, role: user.role }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = generateToken(user);
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, coins: user.coins, role: user.role }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  googleSuccess: (req, res) => {
    if (req.user) {
      const token = generateToken(req.user);
      // In a real app, you might redirect to a frontend success page with the token
      res.json({
        token,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          coins: req.user.coins,
          role: req.user.role,
          profilePicture: req.user.profilePicture
        }
      });
    } else {
      res.status(401).json({ message: 'Google authentication failed' });
    }
  },

  handlePhoneAuth: async (req, res) => {
    try {
      const { uid, phone, name } = req.body;
      
      if (!uid || !phone) {
        return res.status(400).json({ message: 'UID and Phone number are required' });
      }

      // Check if user exists by phone or googleId (using uid as the identifier here)
      let user = await User.findOne({ $or: [{ phone }, { googleId: uid }] });

      if (user) {
         // Login case
         const token = generateToken(user);
         return res.status(200).json({
           token,
           user: { id: user._id, name: user.name, phone: user.phone, email: user.email, coins: user.coins, role: user.role }
         });
      }

      // Signup case: allow phone-only signups by creating a friendly default name when not provided
      const defaultName = name || `User${phone.slice(-4)}`;
      user = new User({
        name: defaultName,
        phone,
        googleId: uid, // storing Firebase UID here
      });

      await user.save();
      const token = generateToken(user);
      
      return res.status(201).json({
        token,
        user: { id: user._id, name: user.name, phone: user.phone, email: user.email, coins: user.coins, role: user.role }
      });

    } catch (err) {
      console.error('Phone Auth Error:', err);
      // Handle MongoDB Duplicate Key errors (E11000) specifically
      if (err.code === 11000) {
        return res.status(400).json({ message: 'An account with this phone number or credentials already exists.' });
      }
      res.status(500).json({ message: 'Server error during phone authentication', error: err.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetUrl = `${frontendUrl}/reset-password/${token}`;

      await emailService.sendPasswordResetEmail(user.email, resetUrl);
      res.json({ message: 'Password reset link sent to your email' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
};

module.exports = authController;
