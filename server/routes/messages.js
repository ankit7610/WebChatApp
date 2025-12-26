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
 * GET /api/messages/conversations
 * Get list of all contacts with last message preview
 * MUST show all contacts regardless of message history
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 1. Get current user to access contacts list
    const currentUser = await User.findOne({ firebaseUid: userId });
    if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Extract contact UIDs from the contacts array (which contains objects {uid, email})
    const contactUids = currentUser.contacts.map(c => c.uid);
    
    // 2. Also find anyone we have exchanged messages with, in case they are not in contacts (optional but good for robustness)
    const sentMessages = await Message.distinct('receiverId', { senderId: userId });
    const receivedMessages = await Message.distinct('senderId', { receiverId: userId });
    
    // Merge all UIDs
    const allPartnerIds = [...new Set([...contactUids, ...sentMessages, ...receivedMessages])];
    
    // 3. Fetch details and last message for each partner
    const conversations = await Promise.all(
      allPartnerIds.map(async (partnerId) => {
        const partner = await User.findOne({ firebaseUid: partnerId }).select('displayName email firebaseUid');
        if (!partner) return null;

        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId }
          ]
        }).sort({ timestamp: -1 });
        
        const unreadCount = await Message.countDocuments({
          senderId: partnerId,
          receiverId: userId,
          seen: false
        });

        return {
          user: {
            _id: partner.firebaseUid,
            displayName: partner.displayName,
            email: partner.email,
            firebaseUid: partner.firebaseUid
          },
          lastMessage,
          unreadCount,
          userId: partner.firebaseUid
        };
      })
    );

    // Filter nulls and sort
    const validConversations = conversations.filter(c => c !== null);
    
    validConversations.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      if (timeA === timeB) {
        return a.user.displayName.localeCompare(b.user.displayName);
      }
      return timeB - timeA;
    });

    res.json(validConversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/messages/:peerUid
 * Fetch entire history with a specific user
 */
router.get('/:peerUid', authenticate, async (req, res) => {
  try {
    const { peerUid } = req.params;
    const currentUserUid = req.user.userId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserUid, receiverId: peerUid },
        { senderId: peerUid, receiverId: currentUserUid }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
