const express = require('express');
require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 YouthGuide NA Backend running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📋 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = server;