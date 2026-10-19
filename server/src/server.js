import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve directory paths for robust .env loading across root and workspace runs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // Fallback to current working directory

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

/**
 * Initializes the database connection and launches the HTTP listener.
 * If the database connection fails, the process halts safely without exposing secrets.
 */
const startServer = async () => {
  try {
    // 1. Establish Database Connection First
    await connectDB();

    // 2. Start HTTP Listener only after DB is successfully connected
    server = app.listen(PORT, () => {
      console.log(`[Server] TenantGuard API running in ${NODE_ENV} mode on port ${PORT}`);
      console.log(`[Server] Health check endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server Initialization Error] Could not start server because database connection failed.');
    console.error('[Action Required] Set a valid MONGODB_URI in your server/.env file.');
    process.exit(1);
  }
};

// Graceful Shutdown Handlers
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
