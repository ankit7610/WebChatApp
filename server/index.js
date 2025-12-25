import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectDB } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initializeFirebase } from './config/firebase.js';
import { setupWebSocket } from './ws.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';

/**
 * Main Server Entry Point
 * 
 * Architecture:
 * - Express for REST API
 * - WebSocket (ws) for real-time chat
 * - MongoDB for data persistence
 * - Redis for pub/sub (multi-instance support)
 * - Firebase Admin for auth verification
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Initialize services
    console.log('🚀 Starting server...');
    
    await connectDB();
    connectRedis();
    initializeFirebase();

    // Create HTTP server (needed for WebSocket upgrade)
    const server = createServer(app);

    // Setup WebSocket server
    setupWebSocket(server);

    // Start listening
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 REST API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectRedis();
  process.exit(0);
});

startServer();
