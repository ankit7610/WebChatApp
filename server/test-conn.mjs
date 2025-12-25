import mongoose from 'mongoose';

const uri = process.argv[2];
if (!uri) {
  console.error('Usage: node test-conn.mjs <MONGODB_URI>');
  process.exit(2);
}

(async () => {
  try {
    console.log('Testing MongoDB URI:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
})();
