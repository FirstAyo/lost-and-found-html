import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized environment configuration.
 * This keeps process.env access in one place and makes the app easier to test.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lost-and-found-app',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production'
};
