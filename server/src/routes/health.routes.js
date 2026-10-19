import express from 'express';
import { isDbConnected } from '../config/db.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    System health check endpoint
 * @access  Public
 * @note    Never exposes database credentials, secrets, or internal stack details
 */
router.get('/health', (req, res) => {
  const dbStatus = isDbConnected() ? 'connected' : 'disconnected';
  
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'tenantguard-api',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
