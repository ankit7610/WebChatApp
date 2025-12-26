import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Message from './models/Message.js';

dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\nUser: ${user.displayName} (${user.firebaseUid})`);
      console.log(`Contacts: ${JSON.stringify(user.contacts)}`);
      
      const sent = await Message.countDocuments({ senderId: user.firebaseUid });
      const received = await Message.countDocuments({ recipientId: user.firebaseUid });
      console.log(`Messages: Sent=${sent}, Received=${received}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDB();
