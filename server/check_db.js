import mongoose from 'mongoose';
import Message from './models/Message.js';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const messages = await Message.find().sort({ timestamp: -1 }).limit(5);
    console.log('Last 5 messages:');
    messages.forEach(m => {
      console.log(`ID: ${m._id}, Text: ${m.text}, Delivered: ${m.delivered}, Seen: ${m.seen}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
