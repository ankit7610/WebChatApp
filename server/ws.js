import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import Message from './models/Message.js';
import User from './models/User.js';
import { getRedisClient, getRedisSub } from './config/redis.js';

const REDIS_CHANNEL = 'chat:messages';

/**
 * WebSocket Server Setup
 * 
 * Key Features:
 * - JWT authentication on connection
 * - Redis pub/sub for multi-instance support
 * - Message persistence to MongoDB
 * - Online user count tracking
 * - Auto-reconnect handling
 */
export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ server });
  const clients = new Map(); // userId -> ws connection

  /**
   * Subscribe to Redis channel for messages from other server instances
   */
  const redisSub = getRedisSub();
  redisSub.subscribe(REDIS_CHANNEL, (err) => {
    if (err) {
      console.error('Failed to subscribe to Redis channel:', err);
    } else {
      console.log(`✅ Subscribed to Redis channel: ${REDIS_CHANNEL}`);
    }
  });

  /**
   * Handle messages from Redis (sent by other server instances)
   * For private messaging - only send to sender and recipient
   */
  redisSub.on('message', (channel, message) => {
    if (channel === REDIS_CHANNEL) {
      const data = JSON.parse(message);
      
      // For private messages, only send to sender and recipient
      if (data.type === 'message' && data.senderId && data.recipientId) {
        const senderWs = clients.get(data.senderId);
        const recipientWs = clients.get(data.recipientId);
        
        if (senderWs && senderWs.readyState === 1) {
          senderWs.send(JSON.stringify(data));
        }
        
        if (recipientWs && recipientWs.readyState === 1) {
          recipientWs.send(JSON.stringify(data));
        }
      }
    }
  });

  /**
   * Handle new WebSocket connections
   */
  wss.on('connection', async (ws, req) => {
    let userId = null;
    let username = null;

    // Extract token from URL query parameter
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
      username = decoded.username;

      // Store connection
      clients.set(userId, ws);
      console.log(`✅ User connected: ${username} (${userId})`);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to chat server',
          username,
        })
      );

    } catch (error) {
      console.error('WebSocket auth failed:', error.message);
      ws.close(4001, 'Invalid token');
      return;
    }

    /**
     * Handle incoming messages from client
     */
    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'message') {
          const { text, recipientId, recipientName } = payload;

          if (!text || text.trim().length === 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Empty message' }));
            return;
          }

          if (!recipientId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Recipient required' }));
            return;
          }

          if (text.length > 1000) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message too long' }));
            return;
          }

          // Save message to MongoDB with private messaging fields
          const message = new Message({
            senderId: userId,
            senderName: username,
            recipientId,
            recipientName,
            text: text.trim(),
            read: false,
          });

          await message.save();

          // Prepare message for private delivery
          const privateMessage = {
            type: 'message',
            id: message._id,
            senderId: userId,
            senderName: username,
            recipientId,
            recipientName,
            text: message.text,
            read: false,
            createdAt: message.createdAt,
            timestamp: message.createdAt,
          };

          // Publish to Redis with recipient info (for multi-server support)
          // The Redis subscriber will handle sending to both sender and recipient
          const redisClient = getRedisClient();
          await redisClient.publish(
            REDIS_CHANNEL,
            JSON.stringify(privateMessage)
          );

          // BOT LOGIC: Check if recipient is a dummy user and auto-reply
          // We check if the recipient is not connected (likely a bot/offline user)
          const recipientWs = clients.get(recipientId);
          if (!recipientWs) {
            const recipientUser = await User.findOne({ firebaseUid: recipientId });
            if (recipientUser && recipientUser.firebaseUid.startsWith('dummy_')) {
              setTimeout(async () => {
                try {
                  const replyText = `Hello! I received your message: "${text}". This is an automated reply from ${recipientUser.displayName}.`;
                  
                  const replyMessage = new Message({
                    senderId: recipientId,
                    senderName: recipientUser.displayName,
                    recipientId: userId,
                    recipientName: username,
                    text: replyText,
                    read: false,
                  });
                  
                  await replyMessage.save();
                  
                  const replyPayload = {
                    type: 'message',
                    id: replyMessage._id,
                    senderId: recipientId,
                    senderName: recipientUser.displayName,
                    recipientId: userId,
                    recipientName: username,
                    text: replyText,
                    read: false,
                    createdAt: replyMessage.createdAt,
                    timestamp: replyMessage.createdAt,
                  };
                  
                  // Publish bot reply to Redis
                  const redisClient = getRedisClient();
                  await redisClient.publish(
                    REDIS_CHANNEL,
                    JSON.stringify(replyPayload)
                  );
                } catch (err) {
                  console.error('Bot reply error:', err);
                }
              }, 1500); // 1.5s delay
            }
          }
        }
      } catch (error) {
        console.error('Message handling error:', error.message);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
          })
        );
      }
    });

    /**
     * Handle client disconnect
     */
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`❌ User disconnected: ${username} (${userId})`);
      }
    });

    /**
     * Handle WebSocket errors
     */
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  });

  console.log('✅ WebSocket server initialized');
  return wss;
};
