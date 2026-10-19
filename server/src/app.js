import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import teamRoutes from './routes/team.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import securityRoutes from './routes/security.routes.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Set trust proxy for deployment and secure cookie rate limiting
app.set('trust proxy', 1);

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) with origin allow-list
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-CSRF-Token']
  })
);

// 3. Cookie Parsing Middleware
app.use(cookieParser());

// 4. Request Body Parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/security', securityRoutes);

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
