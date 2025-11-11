import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from '@/config';
import { loggerStream } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(config.cookie.secret));

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev', { stream: loggerStream }));
} else {
  app.use(morgan('combined', { stream: loggerStream }));
}

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to NIST 800-171 Compliance Tracker API',
    version: '1.0.0',
    endpoints: {
      api: '/api',
      health: '/health',
      controls: '/api/controls',
      assessments: '/api/assessments',
      poams: '/api/poams',
      evidence: '/api/evidence',
      reports: '/api/reports',
    },
  });
});

// Health check endpoint with database status
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is running but database is unavailable',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: 'disconnected',
    });
  }
});

// Import API routes
import apiRoutes from '@/routes';

// API root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'NIST 800-171 Compliance Tracker API',
    version: '1.0.0',
    endpoints: {
      controls: '/api/controls',
      assessments: '/api/assessments',
      poams: '/api/poams',
      evidence: '/api/evidence',
      reports: '/api/reports',
      health: '/health',
    },
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
