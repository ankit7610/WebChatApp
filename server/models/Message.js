import mongoose from 'mongoose';

/**
 * Message Model
 * Stores private chat messages between two users
 */
const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
  },
  receiverId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  clientId: {
    type: String,
    required: false,
  },
  seen: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Number,
    default: () => Date.now(),
  },
});

// Index for faster queries
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, seen: 1 });

export default mongoose.model('Message', messageSchema);
