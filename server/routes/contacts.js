import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';
import { getAuth } from '../config/firebase.js';
import { contactLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const REDIS_CHANNEL = 'chat:messages';

/**
 * Middleware: Verify JWT token
 */
const authenticate = (req, res, next) => {
  try {
    console.log(`[Auth Middleware] Verifying token for ${req.method} ${req.url}`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('[Auth Middleware] No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log(`[Auth Middleware] Token verified for user: ${decoded.userId}`);
    next();
  } catch (error) {
    console.log(`[Auth Middleware] Token verification failed: ${error.message}`);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/contacts
 * Get all contacts for the current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ firebaseUid: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the contacts array directly (it contains { uid, email })
    // We might want to populate displayName if needed, but for now return what's stored
    // To get displayNames, we might need to fetch the user docs for these contacts
    const contactUids = user.contacts.map(c => c.uid);
    const contactDetails = await User.find({ firebaseUid: { $in: contactUids } }).select('displayName email firebaseUid');

    // Filter out any contacts that no longer exist in Firebase Auth
    const auth = getAuth();
    const validated = [];
    await Promise.all(contactDetails.map(async (c) => {
      try {
        await auth.getUser(c.firebaseUid);
        validated.push(c);
      } catch (err) {
        // user not found in Firebase -> skip
        console.log(`[Contacts] Removing stale contact not in Firebase: ${c.firebaseUid}`);
      }
    }));

    const formattedContacts = validated.map(c => ({
      uid: c.firebaseUid,
      email: c.email,
      displayName: c.displayName
    }));

    res.json(formattedContacts);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/contacts/all
 * Return all users who have signed up (except the requester)
 */
router.get('/all', authenticate, async (req, res) => {
  try {
    const currentUid = req.user.userId;
    const users = await User.find({ firebaseUid: { $ne: currentUid } }).select('displayName email firebaseUid');

    // Validate users still exist in Firebase Auth and filter out deleted accounts
    const auth = getAuth();
    const validated = [];
    await Promise.all(users.map(async (u) => {
      try {
        await auth.getUser(u.firebaseUid);
        validated.push(u);
      } catch (err) {
        console.log(`[Contacts] Skipping deleted Firebase user: ${u.firebaseUid}`);
      }
    }));

    const formatted = validated.map(u => ({
      _id: u._id,
      firebaseUid: u.firebaseUid,
      displayName: u.displayName,
      email: u.email,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/contacts/add
 * Add a new contact by email
 */
router.post('/add', contactLimiter, authenticate, async (req, res) => {
  try {
    const { addEmail } = req.body; // Prompt says "addEmail"
    const currentUserUid = req.user.userId;

    console.log(`[Contacts] Attempting to add contact: ${addEmail} for user: ${currentUserUid}`);

    if (!addEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (req.user.email === addEmail) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    // 1. Validate email exists in Firebase Auth
    let firebaseUser;
    try {
      console.log(`[Contacts] Looking up Firebase user by email: ${addEmail}`);
      firebaseUser = await getAuth().getUserByEmail(addEmail);
      console.log(`[Contacts] Found Firebase user: ${firebaseUser.uid}`);
    } catch (error) {
      console.log('[Contacts] Firebase user lookup failed:', error.code || error.message);
      return res.status(404).json({ error: 'User not found in Firebase' });
    }

    const peerUid = firebaseUser.uid;
    const peerEmail = firebaseUser.email;
    const peerName = firebaseUser.displayName || peerEmail.split('@')[0];

    // 2. Ensure peer exists in MongoDB
    console.log(`[Contacts] Checking if peer exists in MongoDB: ${peerUid}`);
    let peerUser = await User.findOne({ firebaseUid: peerUid });
    if (!peerUser) {
      console.log(`[Contacts] Creating new peer user in MongoDB: ${peerUid}`);
      peerUser = new User({
        firebaseUid: peerUid,
        email: peerEmail,
        displayName: peerName,
        contacts: []
      });
      await peerUser.save();
    }

    // 3. Add each user to the other's contacts list (bi-directional)
    console.log(`[Contacts] Updating contact lists bi-directionally`);
    // Add peer to current user
    await User.findOneAndUpdate(
      { firebaseUid: currentUserUid, 'contacts.uid': { $ne: peerUid } },
      { $push: { contacts: { uid: peerUid, email: peerEmail } } }
    );

    // Add current user to peer
    const currentUser = await User.findOne({ firebaseUid: currentUserUid });
    if (!currentUser) {
      console.error(`[Contacts] Current user not found in MongoDB: ${currentUserUid}`);
      return res.status(404).json({ error: 'Current user not found' });
    }

    await User.findOneAndUpdate(
      { firebaseUid: peerUid, 'contacts.uid': { $ne: currentUserUid } },
      { $push: { contacts: { uid: currentUserUid, email: currentUser.email } } }
    );

    // Notify the other user via WebSocket (Redis Pub/Sub)
    try {
      console.log(`[Contacts] Notifying peer via Redis: ${peerUid}`);
      const redisClient = getRedisClient();
      if (redisClient) {
        // Fire-and-forget publish to avoid blocking the HTTP request
        redisClient.publish(REDIS_CHANNEL, JSON.stringify({
          type: 'contact_added',
          recipientId: peerUid,
          senderId: currentUserUid,
          senderName: currentUser.displayName
        })).catch((err) => {
          console.error('[Contacts] Redis publish error (non-blocking):', err);
        });
      }
    } catch (redisErr) {
      console.error('[Contacts] Failed to publish contact_added event:', redisErr);
    }

    // 4. Return updated contact list of current user
    console.log(`[Contacts] Returning updated contact list`);
    const updatedUser = await User.findOne({ firebaseUid: currentUserUid });
    const contactUids = updatedUser.contacts.map(c => c.uid);
    const contactDetails = await User.find({ firebaseUid: { $in: contactUids } }).select('displayName email firebaseUid');

    const formattedContacts = contactDetails.map(c => ({
      uid: c.firebaseUid,
      email: c.email,
      displayName: c.displayName
    }));

    res.json(formattedContacts);

  } catch (error) {
    console.error('[Contacts] Failed to add contact:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

export default router;
