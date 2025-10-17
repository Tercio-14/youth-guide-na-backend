const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const opportunityRoutes = require('./routes/opportunities');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration - Allow both common Vite dev server ports
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Default Vite port
  'http://localhost:8080', // Alternative Vite port
  'http://localhost:3000', // Create React App port
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware with debugging
app.use((req, res, next) => {
  if (req.method === 'POST') {
    logger.info(`[BODY-PARSER] Before parsing - Method: ${req.method}, URL: ${req.url}, Content-Type: ${req.headers['content-type']}, Content-Length: ${req.headers['content-length']}`);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.method === 'POST') {
    logger.info(`[BODY-PARSER] After parsing - Body exists: ${!!req.body}, Body type: ${typeof req.body}, Body keys: [${Object.keys(req.body || {}).join(', ')}], Body empty: ${JSON.stringify(req.body) === '{}'}`);
    logger.info(`[BODY-PARSER] Raw body content: ${JSON.stringify(req.body)}`);
  }
  next();
});

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(`[HTTP] ${message.trim()}`)
  }
}));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  req.requestId = requestId;
  req.startTime = startTime;

  logger.info(`[REQ-${requestId}] ${req.method} ${req.url} - Started`, {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    contentType: req.headers['content-type'],
    hasAuth: !!req.headers.authorization
  });

  // Log request body for POST/PUT requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields from logs
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    logger.debug(`[REQ-${requestId}] Request body:`, sanitizedBody);
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    logger.info(`[REQ-${requestId}] ${req.method} ${req.url} - Completed`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    });
    originalEnd.apply(this, args);
  };

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: require('../package.json').version
  });
});

// Firebase connection test endpoint
app.get('/health/firebase', async (req, res) => {
  try {
    logger.info('[HEALTH] Testing Firebase connection...');
    
    // Test Firestore connection by trying to read from a test collection
    const { collections } = require('./config/firebase');
    const testDoc = await collections.users.limit(1).get();
    
    // Test Firebase Auth by checking if it's initialized
    const { auth } = require('./config/firebase');
    const isAuthInitialized = !!auth.app;
    
    logger.info('[HEALTH] Firebase connection test successful');
    
    res.status(200).json({
      status: 'healthy',
      services: {
        firestore: {
          status: 'connected',
          canRead: !testDoc.empty,
          timestamp: new Date().toISOString()
        },
        auth: {
          status: isAuthInitialized ? 'initialized' : 'not_initialized',
          timestamp: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('[HEALTH] Firebase connection test failed:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Firebase connection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'YouthGuide NA Backend API',
    version: require('../package.json').version,
    description: 'RAG-powered chatbot API for connecting youth to opportunities',
    endpoints: {
      'POST /api/chat': 'Send chat message and get RAG response',
      'GET /api/opportunities': 'List and filter opportunities',
      'POST /api/opportunities': 'Create opportunity (admin only)',
      'GET /api/users/profile': 'Get user profile',
      'POST /api/users/profile': 'Create/update user profile',
      'POST /api/auth/verify': 'Verify Firebase auth token'
    },
    documentation: 'https://github.com/Tercio-14/youth-guide-na-backend'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;