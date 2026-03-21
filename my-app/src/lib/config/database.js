import mongoose from 'mongoose';

// Use global singleton to prevent reconnection in serverless
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering to fail fast
      serverSelectionTimeoutMS: 10000, // Fail faster in serverless
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URL, opts).then((mongoose) => {
      console.log('[OK] MongoDB Connected');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[ERROR] MongoDB connection failed:', e.message);
    throw e;
  }

  return cached.conn;
};

export default connectDB;
