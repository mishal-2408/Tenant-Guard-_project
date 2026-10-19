import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) with origin allow-list
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Request Body Parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. API Routes
app.use('/api', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'TenantGuard API',
    version: '1.0.0',
    description: 'Secure Multi-Tenant Workspace Portal and API',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// 5. Centralized 404 Not Found Middleware
app.use(notFoundHandler);

// 6. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
