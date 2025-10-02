import jwt from "jsonwebtoken";

/**
 * Secure Authentication Utility for Cookie-Based JWT Storage
 * This replaces localStorage token storage with secure httpOnly cookies
 */

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,           // Prevents XSS attacks - no JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',       // CSRF protection
  maxAge: 8 * 60 * 60 * 1000,  // 8 hours expiration
  path: '/'                 // Available site-wide
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
  path: '/'
};

/**
 * Generate access and refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '8h' 
  });
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
  
  return { accessToken, refreshToken };
};

/**
 * Set secure authentication cookies
 */
export const setAuthCookies = (res, user) => {
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Set access token cookie
  res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
  
  // Set refresh token cookie  
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  
  return { accessToken, refreshToken };
};

/**
 * Clear authentication cookies on logout
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { 
    path: '/', 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.clearCookie('refreshToken', { 
    path: '/', 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

/**
 * Verify JWT token from cookie or header
 */
export const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken 
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;
      
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

/**
 * Extract token from cookies or Authorization header (fallback)
 */
export const extractToken = (req) => {
  // Priority 1: httpOnly cookie (most secure)
  if (req.cookies?.accessToken) {
    return { token: req.cookies.accessToken, source: 'cookie' };
  }
  
  // Priority 2: Authorization header (fallback for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.split(' ')[1], source: 'header' };
  }
  
  return { token: null, source: null };
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return null;
    }
    
    const decoded = verifyToken(refreshToken, true);
    if (!decoded) {
      return null;
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, COOKIE_OPTIONS);
    
    return decoded;
    
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return null;
  }
};

/**
 * Secure Socket.IO token extraction
 */
export const extractSocketToken = (socket) => {
  // Try to get token from handshake auth first
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return authToken;
  
  // Fallback to cookies if available
  const cookies = socket.handshake?.headers?.cookie;
  if (cookies) {
    const cookieMap = {};
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookieMap[name] = value;
    });
    return cookieMap.accessToken;
  }
  
  return null;
};