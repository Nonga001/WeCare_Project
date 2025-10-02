import validator from "validator";
import { body, param, query, validationResult } from "express-validator";

/**
 * Comprehensive Input Validation and Sanitization System
 * Prevents SQL injection, XSS, and other input-based attacks
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export const sanitizeString = (input, options = {}) => {
  if (typeof input !== 'string') return '';
  
  const {
    allowTags = false,
    maxLength = 1000,
    trim = true,
    escape = true
  } = options;
  
  let sanitized = input;
  
  // Trim whitespace
  if (trim) sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove or escape HTML tags
  if (!allowTags && escape) {
    sanitized = validator.escape(sanitized);
  }
  
  // Remove null bytes and other dangerous characters
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
};

/**
 * Validate and sanitize email
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, sanitized: '', error: 'Email is required' };
  }
  
  const sanitized = sanitizeString(email, { maxLength: 254 }).toLowerCase();
  
  if (!validator.isEmail(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })) {
    return { 
      isValid: false, 
      error: 'Password must contain uppercase, lowercase, number, and special character' 
    };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return { isValid: false, sanitized: '', error: 'ID is required' };
  }
  
  const sanitized = sanitizeString(id, { maxLength: 24 });
  
  if (!validator.isMongoId(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid ID format' };
  }
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, sanitized: '', error: 'Phone number is required' };
  }
  
  // Remove all non-numeric characters for validation
  const cleaned = phone.replace(/\D/g, '');
  const sanitized = sanitizeString(phone, { maxLength: 20 });
  
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { isValid: false, sanitized, error: 'Phone number must be 10-15 digits' };
  }
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Validate university name
 */
export const validateUniversity = (university) => {
  if (!university || typeof university !== 'string') {
    return { isValid: false, sanitized: '', error: 'University is required' };
  }
  
  const sanitized = sanitizeString(university, { maxLength: 200 });
  
  if (sanitized.length < 2) {
    return { isValid: false, sanitized, error: 'University name too short' };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-'\.]+$/.test(sanitized)) {
    return { isValid: false, sanitized, error: 'University name contains invalid characters' };
  }
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Validate amount for financial transactions
 */
export const validateAmount = (amount) => {
  if (amount === undefined || amount === null) {
    return { isValid: false, sanitized: 0, error: 'Amount is required' };
  }
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount) || numAmount < 0) {
    return { isValid: false, sanitized: 0, error: 'Amount must be a positive number' };
  }
  
  if (numAmount > 1000000) { // Max 1M KES
    return { isValid: false, sanitized: numAmount, error: 'Amount exceeds maximum limit' };
  }
  
  // Round to 2 decimal places
  const sanitized = Math.round(numAmount * 100) / 100;
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Validate reason/description text
 */
export const validateText = (text, options = {}) => {
  const {
    required = true,
    minLength = 10,
    maxLength = 1000,
    fieldName = 'Text'
  } = options;
  
  if (!text || typeof text !== 'string') {
    if (required) {
      return { isValid: false, sanitized: '', error: `${fieldName} is required` };
    }
    return { isValid: true, sanitized: '', error: null };
  }
  
  const sanitized = sanitizeString(text, { maxLength, allowTags: false });
  
  if (sanitized.length < minLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `${fieldName} must be at least ${minLength} characters` 
    };
  }
  
  return { isValid: true, sanitized, error: null };
};

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * Express-validator chains for common validations
 */

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name contains invalid characters')
    .escape(),
    
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .isStrongPassword({
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number required'),
    
  body('university')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('University name must be 2-200 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('University name contains invalid characters')
    .escape(),
    
  handleValidationErrors
];

// Aid request validation
export const validateAidRequest = [
  body('type')
    .isIn(['financial', 'essentials'])
    .withMessage('Type must be financial or essentials'),
    
  body('amount')
    .if(body('type').equals('financial'))
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Amount must be between 1 and 1,000,000')
    .toFloat(),
    
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be 10-1000 characters')
    .escape(),
    
  body('items')
    .if(body('type').equals('essentials'))
    .isArray({ min: 1 })
    .withMessage('At least one item required for essentials'),
    
  body('items.*.name')
    .if(body('type').equals('essentials'))
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Item name must be 1-100 characters')
    .escape(),
    
  body('items.*.quantity')
    .if(body('type').equals('essentials'))
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be 1-1000')
    .toInt(),
    
  handleValidationErrors
];

// Login validation
export const validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  body('role')
    .isIn(['student', 'donor', 'admin', 'superadmin'])
    .withMessage('Valid role is required'),
    
  handleValidationErrors
];

// MongoDB ID validation for params
export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
    
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be 1-1000')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100')
    .toInt(),
    
  handleValidationErrors
];