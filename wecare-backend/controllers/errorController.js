import { securityLogger } from "../utils/securityLogger.js";

/**
 * Client Error Logging Controller
 * Handles error reports from the frontend application
 */

export const logClientError = async (req, res) => {
  try {
    const {
      errorId,
      message,
      stack,
      componentStack,
      userAgent,
      url,
      timestamp,
      type = 'client_error'
    } = req.body;

    // Validate required fields
    if (!errorId || !message) {
      return res.status(400).json({ 
        message: 'Error ID and message are required' 
      });
    }

    // Log the client error with security logger
    securityLogger.systemError(
      { 
        message: `[CLIENT ERROR] ${message}`, 
        stack: stack || 'No stack trace available',
        errorId,
        type,
        componentStack,
        clientTimestamp: timestamp,
        clientUrl: url,
        clientUserAgent: userAgent
      }, 
      req
    );

    // If it's a security-related error, log as suspicious activity
    const securityKeywords = ['xss', 'injection', 'csrf', 'unauthorized', 'forbidden'];
    if (securityKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      securityLogger.suspiciousActivity(req, 'Security-related client error', {
        errorId,
        errorMessage: message,
        errorType: type
      });
    }

    res.status(200).json({ 
      message: 'Error logged successfully',
      errorId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to log client error:', error.message);
    res.status(500).json({ 
      message: 'Failed to log error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getErrorStats = async (req, res) => {
  try {
    // This would typically query a database of logged errors
    // For now, return basic stats
    const stats = {
      totalErrors: 0,
      recentErrors: 0,
      errorTypes: {},
      message: 'Error statistics not yet implemented - check log files'
    };

    res.json(stats);
  } catch (error) {
    securityLogger.systemError(error, req);
    res.status(500).json({ 
      message: 'Failed to get error statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};