import Redis from 'ioredis';

/**
 * Redis Connection for Pub/Sub
 * Uses Upstash Redis free tier (10,000 commands/day)
 * Enables horizontal scaling of WebSocket servers
 */
let redisClient = null;
let redisSub = null;

export const connectRedis = () => {
  try {
    const redisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      keepAlive: 10000,
      family: 4,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    // Add TLS if using rediss://
    if (process.env.REDIS_URL.startsWith('rediss://')) {
      redisOptions.tls = { rejectUnauthorized: false };
    }

    // Publisher client
    redisClient = new Redis(process.env.REDIS_URL, redisOptions);

    // Subscriber client (separate connection required for pub/sub)
    redisSub = new Redis(process.env.REDIS_URL, redisOptions);

    redisClient.once('connect', () => {
      console.log('✅ Redis publisher connected');
    });

    redisSub.once('connect', () => {
      console.log('✅ Redis subscriber connected');
    });

    redisClient.on('reconnecting', () => {
      // Silent or low-priority log
    });

    redisClient.on('error', (err) => {
      if (err.message.includes('ECONNRESET')) return; // Ignore common reset errors
      console.error('❌ Redis publisher error:', err.message);
    });

    redisSub.on('error', (err) => {
      if (err.message.includes('ECONNRESET')) return; // Ignore common reset errors
      console.error('❌ Redis subscriber error:', err.message);
    });

    return { redisClient, redisSub };
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    throw error;
  }
};

export const getRedisClient = () => redisClient;
export const getRedisSub = () => redisSub;

export const disconnectRedis = async () => {
  if (redisClient) await redisClient.quit();
  if (redisSub) await redisSub.quit();
  console.log('🔌 Redis connections closed');
};
