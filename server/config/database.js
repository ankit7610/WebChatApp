import mongoose from 'mongoose';

/**
 * MongoDB Connection
 * Uses MongoDB Atlas free tier (M0)
 * Connection string should be in .env as MONGODB_URI
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};
