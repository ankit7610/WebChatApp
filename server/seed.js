import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import { connectDB } from './config/database.js';

const dummyUsers = [
  {
    firebaseUid: 'dummy_1',
    email: 'alice@example.com',
    displayName: 'Alice Wonderland',
  },
  {
    firebaseUid: 'dummy_2',
    email: 'bob@example.com',
    displayName: 'Bob Builder',
  },
  {
    firebaseUid: 'dummy_3',
    email: 'charlie@example.com',
    displayName: 'Charlie Chaplin',
  },
  {
    firebaseUid: 'dummy_4',
    email: 'david@example.com',
    displayName: 'David Beckham',
  }
];

const seedUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    for (const user of dummyUsers) {
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        await User.create(user);
        console.log(`Created user: ${user.displayName}`);
      } else {
        console.log(`User already exists: ${user.displayName}`);
      }
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedUsers();
