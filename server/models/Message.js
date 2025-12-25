import mongoose from 'mongoose';

/**
 * Message Model
 * Stores private chat messages between two users
 */
const messageSchema = new mongoose.Schema({
  senderId: {
    type: String, // Use Firebase UID (String)
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  recipientId: {
    type: String, // Use Firebase UID (String)
    required: true,
  },
  recipientName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, read: 1 });

// Helper method to get conversation between two users
messageSchema.statics.getConversation = function(userId1, userId2) {
  return this.find({
    $or: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 }
    ]
  }).sort({ createdAt: 1 });
};

export default mongoose.model('Message', messageSchema);
