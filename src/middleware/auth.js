const { auth } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Middleware to verify Firebase Auth token
 */
const verifyToken = async (req, res, next) => {
  let token;

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid authorization header found'
      });
    }

  token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required', 
        message: 'No token provided'
      });
    }

    logger.debug(`[AUTH] Verifying token for request to: ${req.method} ${req.path}`);
    
    // Verify token with Firebase
    const decodedToken = await auth.verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      authTime: decodedToken.auth_time,
      iat: decodedToken.iat,
      exp: decodedToken.exp
    };

    logger.info(`[AUTH] User authenticated successfully: ${decodedToken.uid} (${decodedToken.email}) for ${req.method} ${req.path}`);
    logger.debug(`[AUTH] Token details:`, {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      authTime: new Date(decodedToken.auth_time * 1000).toISOString(),
      tokenExpiry: new Date(decodedToken.exp * 1000).toISOString()
    });
    next();
    
  } catch (error) {
    logger.error(`[AUTH] Token verification failed for ${req.method} ${req.path}:`, {
      error: error.message,
      code: error.code,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });
    
    if (error.code === 'auth/id-token-expired') {
      logger.warn(`[AUTH] Expired token attempt from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      logger.warn(`[AUTH] Invalid token attempt from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    }

    if (error.code === 'auth/argument-error') {
      logger.warn(`[AUTH] Malformed token from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Malformed token',
        message: 'Authentication token format is invalid'
      });
    }
    
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Could not verify authentication token'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user document from Firestore to check admin role
    const { collections } = require('../config/firebase');
    const userDoc = await collections.users.doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    
    if (!userData.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }
    
    logger.debug(`Admin access granted: ${req.user.uid}`);
    next();
    
  } catch (error) {
    logger.error('Admin verification failed:', error);
    return res.status(500).json({
      error: 'Authorization check failed'
    });
  }
};

/**
 * Optional auth middleware - adds user info if token present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      
      if (token) {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified
        };
      }
    }
    
    next();
  } catch (error) {
    // Don't fail if token is invalid for optional auth
    logger.debug('Optional auth failed, continuing without user:', error.message);
    next();
  }
};

module.exports = {
  verifyToken,
  requireAdmin, 
  optionalAuth
};