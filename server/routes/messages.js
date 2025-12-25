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
    const users = await User.find({ _id: { $ne: req.user.userId } })
      .select('displayName email _id')
      .lean();

    res.json(users);
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
    const { userId } = req.params;
    
    const messages = await Message.getConversation(req.user.userId, userId);

    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch conversation:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/messages/conversations
 * Get list of all conversations with last message preview
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all unique conversation partners
    const sentMessages = await Message.distinct('recipientId', { senderId: userId });
    const receivedMessages = await Message.distinct('senderId', { recipientId: userId });
    
    const conversationPartnerIds = [...new Set([...sentMessages, ...receivedMessages])];
    
    // Get user details and last message for each conversation
    const conversations = await Promise.all(
      conversationPartnerIds.map(async (partnerId) => {
        const partner = await User.findById(partnerId).select('displayName email _id');
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
          user: partner,
          lastMessage,
          unreadCount
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => 
      (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0)
    );

    res.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
