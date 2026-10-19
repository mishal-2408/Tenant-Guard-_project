import mongoose from 'mongoose';

/**
 * Reusable Mongoose Database Connection Module
 * Connects to MongoDB Atlas or local MongoDB instance using MONGODB_URI.
 * Sanitizes and shields credentials from all console logs and error traces.
 */

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    const errorMsg = 
      '[Database Error] MONGODB_URI is not configured or contains unreplaced placeholders.\n' +
      'Please configure a valid MongoDB connection string in server/.env (e.g., MONGODB_URI=mongodb+srv://... or mongodb://localhost:27017/tenantguard)';
    console.error(errorMsg);
    throw new Error('MONGODB_URI_NOT_CONFIGURED');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in dev/test, disable automatic build in high-traffic production
    });

    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Sanitize error: never log full connection string with credentials
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed.');
  }
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
