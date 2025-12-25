import express from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Middleware: Verify JWT token
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/messages/users
 * Get list of all users (for contact list)
 */
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.find({ firebaseUid: { $ne: req.user.userId } })
      .select('displayName email firebaseUid')
      .lean();

    // Map firebaseUid to _id for frontend compatibility if needed, 
    // but we'll use firebaseUid as the primary ID now
    const formattedUsers = users.map(u => ({
      ...u,
      _id: u.firebaseUid // Use firebaseUid as the ID
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/messages/conversation/:userId
 * Get conversation with a specific user
 */
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params; // This is now a firebaseUid
    
    const messages = await Message.getConversation(req.user.userId, userId);

    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch conversation:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Alias for GET /api/messages/conversation/:userId
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.getConversation(req.user.userId, userId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/messages/contacts
 * Add a user to contacts by email
 */
router.post('/contacts', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    const currentUserId = req.user.userId;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find the user by email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userToAdd.firebaseUid === currentUserId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    // Add to current user's contacts if not already present
    await User.findOneAndUpdate(
      { firebaseUid: currentUserId },
      { $addToSet: { contacts: userToAdd.firebaseUid } }
    );

    res.json({ 
      message: 'Contact added successfully',
      user: {
        _id: userToAdd.firebaseUid,
        displayName: userToAdd.displayName,
        email: userToAdd.email,
        firebaseUid: userToAdd.firebaseUid
      }
    });
  } catch (error) {
    console.error('Failed to add contact:', error.message);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

/**
 * GET /api/messages/conversations
 * Get list of all conversations and contacts with last message preview
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId; // This is now a firebaseUid
    
    // Get current user to access contacts
    const currentUser = await User.findOne({ firebaseUid: userId });
    const contactIds = currentUser?.contacts || [];

    // Get all unique conversation partners
    const sentMessages = await Message.distinct('recipientId', { senderId: userId });
    const receivedMessages = await Message.distinct('senderId', { recipientId: userId });
    
    // Merge conversation partners and manually added contacts
    const allPartnerIds = [...new Set([...sentMessages, ...receivedMessages, ...contactIds])];
    
    // Get user details and last message for each conversation/contact
    const conversations = await Promise.all(
      allPartnerIds.map(async (partnerId) => {
        const partner = await User.findOne({ firebaseUid: partnerId }).select('displayName email firebaseUid');
        if (!partner) return null;

        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, recipientId: partnerId },
            { senderId: partnerId, recipientId: userId }
          ]
        }).sort({ createdAt: -1 });
        
        const unreadCount = await Message.countDocuments({
          senderId: partnerId,
          recipientId: userId,
          read: false
        });

        return {
          user: {
            ...partner.toObject(),
            _id: partner.firebaseUid
          },
          lastMessage,
          unreadCount,
          userId: partner.firebaseUid
        };
      })
    );

    // Filter out nulls and sort by last message time
    const validConversations = conversations.filter(c => c !== null);
    validConversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || 0;
      const timeB = b.lastMessage?.createdAt || 0;
      // If times are equal (e.g. both 0), sort by name
      if (timeA === timeB) {
        return a.user.displayName.localeCompare(b.user.displayName);
      }
      return new Date(timeB) - new Date(timeA);
    });

    res.json(validConversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
