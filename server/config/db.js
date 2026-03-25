import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

/**
 * Singleton MongoDB connection manager.
 * Reuses the existing connection instead of opening duplicate connections.
 */
export async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const connection = await mongoose.connect(env.mongoUri, {
    autoIndex: true
  });

  isConnected = connection.connection.readyState === 1;
  return connection.connection;
}
