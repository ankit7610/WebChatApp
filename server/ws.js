import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import Message from './models/Message.js';
import User from './models/User.js';
import { getRedisClient, getRedisSub } from './config/redis.js';

const REDIS_CHANNEL = 'chat:messages';

/**
 * WebSocket Server Setup
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
   */
  redisSub.on('message', (channel, message) => {
    if (channel === REDIS_CHANNEL) {
      const data = JSON.parse(message);
      
      // For private messages, only send to sender and receiver
      if (data.type === 'message' && data.senderId && data.receiverId) {
        const senderWs = clients.get(data.senderId);
        const receiverWs = clients.get(data.receiverId);
        
        if (senderWs && senderWs.readyState === 1) {
          senderWs.send(JSON.stringify(data));
        }
        
        if (receiverWs && receiverWs.readyState === 1) {
          receiverWs.send(JSON.stringify(data));
        }
      }

      // Handle new contact notification
      if (data.type === 'contact_added' && data.recipientId) {
        const recipientWs = clients.get(data.recipientId);
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
          const { text, receiverId } = payload; // Expect receiverId

          if (!text || text.trim().length === 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Empty message' }));
            return;
          }

          if (!receiverId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Receiver required' }));
            return;
          }

          if (text.length > 1000) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message too long' }));
            return;
          }

          // Save message to MongoDB
          const senderIdStr = String(userId);
          const receiverIdStr = String(receiverId);

          console.log(`📝 Saving message: ${senderIdStr} -> ${receiverIdStr}`);

          const message = new Message({
            senderId: senderIdStr,
            receiverId: receiverIdStr,
            text: text.trim(),
            seen: false,
            timestamp: Date.now()
          });

          await message.save();

          // Prepare message for private delivery (include clientId if provided)
          const privateMessage = {
            type: 'message',
            id: message._id,
            clientId: payload.clientId || null,
            senderId: senderIdStr,
            receiverId: receiverIdStr,
            text: message.text,
            seen: false,
            timestamp: message.timestamp,
          };

          // Publish to Redis
          const redisClient = getRedisClient();
          await redisClient.publish(
            REDIS_CHANNEL,
            JSON.stringify(privateMessage)
          );
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
      console.error('WebSocket error:', error);
    });
  });

  console.log('✅ WebSocket server initialized');
  return wss;
};
