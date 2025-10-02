import fs from 'fs';
import path from 'path';

/**
 * Comprehensive Security Logging System
 * Tracks security events, authentication attempts, and suspicious activities
 */

const LOG_DIR = path.join(process.cwd(), 'logs');
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log entry with timestamp and structured data
 */
const formatLogEntry = (level, category, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    category,
    message,
    metadata: {
      ...metadata,
      pid: process.pid,
      nodeVersion: process.version
    }
  };
  
  return JSON.stringify(entry) + '\n';
};

/**
 * Write log entry to file safely
 */
const writeLog = (filePath, entry) => {
  try {
    fs.appendFileSync(filePath, entry);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
};

/**
 * Extract request information safely
 */
const extractRequestInfo = (req) => {
  return {
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    method: req.method,
    url: req.originalUrl || req.url,
    referrer: req.get('Referer') || 'none',
    userId: req.user?._id || 'anonymous',
    userRole: req.user?.role || 'none'
  };
};

/**
 * Security event logging functions
 */
export const securityLogger = {
  // Authentication events
  loginSuccess: (req, user) => {
    const entry = formatLogEntry('info', 'AUTH_SUCCESS', 'User login successful', {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.log(`✅ Login success: ${user.email} (${user.role})`);
  },

  loginFailure: (req, email, reason) => {
    const entry = formatLogEntry('warn', 'AUTH_FAILURE', 'Login attempt failed', {
      email,
      reason,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.warn(`❌ Login failed: ${email} - ${reason}`);
  },

  logout: (req, user) => {
    const entry = formatLogEntry('info', 'AUTH_LOGOUT', 'User logout', {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.log(`👋 Logout: ${user.email}`);
  },

  // Registration events
  registrationAttempt: (req, email, role, success, reason = null) => {
    const level = success ? 'info' : 'warn';
    const entry = formatLogEntry(level, 'REGISTRATION', `Registration ${success ? 'successful' : 'failed'}`, {
      email,
      role,
      success,
      reason,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    
    if (success) {
      console.log(`📝 Registration success: ${email} (${role})`);
    } else {
      console.warn(`📝❌ Registration failed: ${email} - ${reason}`);
    }
  },

  // Password changes
  passwordChange: (req, user, success, reason = null) => {
    const level = success ? 'info' : 'warn';
    const entry = formatLogEntry(level, 'PASSWORD_CHANGE', `Password change ${success ? 'successful' : 'failed'}`, {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      success,
      reason,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
  },

  // Suspicious activities
  suspiciousActivity: (req, activity, details = {}) => {
    const entry = formatLogEntry('error', 'SUSPICIOUS', activity, {
      ...details,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.error(`🚨 Suspicious activity: ${activity}`, details);
  },

  // Rate limiting
  rateLimitExceeded: (req, limit) => {
    const entry = formatLogEntry('warn', 'RATE_LIMIT', 'Rate limit exceeded', {
      limit,
      windowMs: limit.windowMs || 'unknown',
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.warn(`🚫 Rate limit exceeded: ${req.ip}`);
  },

  // Validation failures
  validationFailure: (req, errors) => {
    const entry = formatLogEntry('warn', 'VALIDATION', 'Input validation failed', {
      errors,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.warn(`⚠️ Validation failure:`, errors);
  },

  // Data access events
  dataAccess: (req, resource, action) => {
    const entry = formatLogEntry('info', 'DATA_ACCESS', `${action} ${resource}`, {
      resource,
      action,
      ...extractRequestInfo(req)
    });
    writeLog(ACCESS_LOG_FILE, entry);
  },

  // Permission violations
  permissionDenied: (req, requiredPermission, attemptedAction) => {
    const entry = formatLogEntry('warn', 'PERMISSION_DENIED', 'Access denied', {
      requiredPermission,
      attemptedAction,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.warn(`🔒 Permission denied: ${req.user?.email || 'anonymous'} - ${attemptedAction}`);
  },

  // System errors
  systemError: (error, req = null) => {
    const entry = formatLogEntry('error', 'SYSTEM_ERROR', error.message, {
      stack: error.stack,
      ...(req ? extractRequestInfo(req) : {})
    });
    writeLog(ERROR_LOG_FILE, entry);
    console.error(`💥 System error:`, error.message);
  },

  // SuperAdmin activities
  superAdminActivity: (req, action, details = {}) => {
    const entry = formatLogEntry('info', 'SUPERADMIN', action, {
      ...details,
      ...extractRequestInfo(req)
    });
    writeLog(SECURITY_LOG_FILE, entry);
    console.log(`👑 SuperAdmin activity: ${action}`);
  }
};

/**
 * Express middleware for request logging
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  const requestEntry = formatLogEntry('info', 'REQUEST', 'Incoming request', extractRequestInfo(req));
  writeLog(ACCESS_LOG_FILE, requestEntry);
  
  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const responseEntry = formatLogEntry('info', 'RESPONSE', 'Response sent', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      size: Buffer.byteLength(data || ''),
      ...extractRequestInfo(req)
    });
    writeLog(ACCESS_LOG_FILE, responseEntry);
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error handling middleware with logging
 */
export const errorLogger = (error, req, res, next) => {
  securityLogger.systemError(error, req);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    message: 'Internal server error',
    ...(isDevelopment && { error: error.message, stack: error.stack })
  });
};

/**
 * Middleware to detect and log suspicious patterns
 */
export const suspiciousActivityDetector = (req, res, next) => {
  const requestInfo = extractRequestInfo(req);
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    // SQL injection attempts
    /(\b(union|select|insert|delete|update|drop|create|alter)\b)|('|--|\/\*|\*\/)/i,
    // XSS attempts  
    /<script|javascript:|on\w+\s*=/i,
    // Path traversal
    /\.\.[\/\\]/,
    // Command injection
    /[;&|`$(){}]/
  ];
  
  const payload = JSON.stringify({
    url: req.originalUrl,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(payload)) {
      securityLogger.suspiciousActivity(req, 'Malicious pattern detected', {
        pattern: pattern.toString(),
        payload: payload.substring(0, 500) // Limit payload size in logs
      });
      break;
    }
  }
  
  next();
};

export default securityLogger;