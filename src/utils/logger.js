const winston = require('winston');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1, 
  info: 2,
  debug: 3
};

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green', 
  debug: 'blue'
});

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
      // Format metadata (additional data objects)
      let metaStr = '';
      if (Object.keys(metadata).length > 0) {
        // Remove winston internal properties
        const { timestamp: _, level: __, message: ___, ...cleanMeta } = metadata;
        if (Object.keys(cleanMeta).length > 0) {
          metaStr = '\n' + JSON.stringify(cleanMeta, null, 2);
        }
      }
      return `${timestamp} [${level}]: ${message}${metaStr} ${stack || ''}`;
    })
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

module.exports = logger;