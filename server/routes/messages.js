import express from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';

import { getAuth } from '../config/firebase.js';

const router = express.Router();
const REDIS_CHANNEL = 'chat:messages';

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
    
    // 1. Get all users except current user (to show everyone in the list)
    const allUsers = await User.find({ firebaseUid: { $ne: userId } }).select('displayName email firebaseUid');
    
    // 2. Fetch details and last message for each user
    const auth = getAuth();
    const conversations = await Promise.all(
      allUsers.map(async (partner) => {
        const partnerId = partner.firebaseUid;

        // Verify user exists in Firebase
        try {
          await auth.getUser(partnerId);
        } catch (err) {
          console.log(`[Messages] Skipping deleted Firebase user: ${partnerId}`);
          return null;
        }

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

    // Mark messages from peer as seen
    const result = await Message.updateMany(
      { senderId: peerUid, receiverId: currentUserUid, seen: false },
      { $set: { seen: true } }
    );

    if (result.modifiedCount > 0) {
      // Notify the sender (peerUid) that their messages were seen by currentUserUid
      try {
        const redisClient = getRedisClient();
        const seenReceipt = {
          type: 'seen_receipt',
          senderId: peerUid, // The one who should receive the notification
          receiverId: currentUserUid, // The one who read the messages
          timestamp: Date.now()
        };
        
        if (redisClient && redisClient.status === 'ready') {
             await redisClient.publish(REDIS_CHANNEL, JSON.stringify(seenReceipt));
        }
      } catch (err) {
        console.error('Failed to send seen receipt:', err);
      }
    }

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
