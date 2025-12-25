import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../config/firebase.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 
 * Flow:
 * 1. Client authenticates with Firebase (client-side)
 * 2. Client sends Firebase ID token to this endpoint
 * 3. Backend verifies token with Firebase Admin SDK
 * 4. Backend creates/updates user in MongoDB
 * 5. Backend issues JWT for WebSocket authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token required' });
    }

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    const { uid, email, name } = decodedToken;

    // Create or update user in MongoDB
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email || 'anonymous@chat.app',
        displayName: name || email?.split('@')[0] || 'Anonymous',
      });
      await user.save();
    }

    // Generate JWT for WebSocket authentication
    const token = jwt.sign(
      {
        userId: user._id,
        firebaseUid: user.firebaseUid,
        username: user.displayName,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/verify
 * Verify if JWT is still valid
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;
