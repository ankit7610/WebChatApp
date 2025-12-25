import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import { connectDB } from './config/database.js';

const checkUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u.displayName} (${u.email}) ID: ${u._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUsers();
