import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// Use global singleton to prevent reconnection on hot reload
const globalForMongoose = globalThis;

const connectDB = async () => {
  // Check if already connected
  if (globalForMongoose._mongooseConnection) {
    if (mongoose.connection.readyState === 1) {
      return globalForMongoose._mongooseConnection;
    }
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 — avoids DNS resolution issues
    });

    console.log(`[OK] MongoDB Connected`);
    // console.log(`[DATA] Database: ${conn.connection.name}`);

    // Handle connection events (only set once)
    if (!globalForMongoose._mongooseListenersSet) {
      mongoose.connection.on('error', (err) => {
        console.error('[ERROR] MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('[WARN] MongoDB disconnected');
        globalForMongoose._mongooseConnection = null;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });

      globalForMongoose._mongooseListenersSet = true;
    }

    globalForMongoose._mongooseConnection = conn;
    return conn;
  } catch (error) {
    console.error('[ERROR] Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;
