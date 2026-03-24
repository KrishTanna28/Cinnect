import { NextResponse } from 'next/server'

/**
 * Standardized API response utility
 * Ensures consistent response format across all API routes
 */

// User-friendly error messages mapping
const ERROR_MESSAGES = {
  // Authentication errors
  UNAUTHORIZED: 'Please log in to continue',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_INVALID: 'Invalid authentication. Please log in again',
  USER_NOT_FOUND: 'Account not found',

  // Validation errors
  INVALID_INPUT: 'Please check your input and try again',
  MISSING_FIELDS: 'Please fill in all required fields',
  INVALID_ID: 'Invalid request',

  // Rate limiting
  RATE_LIMITED: 'Too many requests. Please try again later',

  // Server errors
  SERVER_ERROR: 'Something went wrong. Please try again',
  DATABASE_ERROR: 'Something went wrong. Please try again',
  EXTERNAL_SERVICE_ERROR: 'Service temporarily unavailable',

  // Resource errors
  NOT_FOUND: 'The requested resource was not found',
  ALREADY_EXISTS: 'This resource already exists',
  FORBIDDEN: 'You do not have permission to perform this action',
}

/**
 * Create a success response
 */
export function success(data = null, message = null, status = 200) {
  const response = { success: true }
  if (data !== null) response.data = data
  if (message) response.message = message
  return NextResponse.json(response, { status })
}

/**
 * Create an error response with user-friendly message
 * @param {string} errorType - Key from ERROR_MESSAGES or custom message
 * @param {number} status - HTTP status code
 * @param {object} extra - Additional fields to include in response
 */
export function error(errorType, status = 400, extra = {}) {
  const message = ERROR_MESSAGES[errorType] || errorType
  return NextResponse.json(
    { success: false, message, ...extra },
    { status }
  )
}

/**
 * Handle errors from try-catch blocks
 * Logs detailed error internally, returns user-friendly message
 */
export function handleError(err, context = '') {
  // Log detailed error for debugging (internal only)
  console.error(`[API Error]${context ? ` ${context}:` : ''}`, err)

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    return error(`${capitalizeFirst(field)} already exists`, 400)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {})
      .map(e => e.message)
      .join('. ')
    return error(messages || ERROR_MESSAGES.INVALID_INPUT, 400)
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return error(ERROR_MESSAGES.INVALID_ID, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(ERROR_MESSAGES.TOKEN_INVALID, 401)
  }

  if (err.name === 'TokenExpiredError') {
    return error(ERROR_MESSAGES.TOKEN_EXPIRED, 401)
  }

  // Network/fetch errors
  if (err.name === 'FetchError' || err.code === 'ECONNREFUSED') {
    return error(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR, 503)
  }

  // Custom error with status
  if (err.status && err.message) {
    return error(err.message, err.status)
  }

  // Default server error - never expose internal details
  return error(ERROR_MESSAGES.SERVER_ERROR, 500)
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message = ERROR_MESSAGES.UNAUTHORIZED) {
  return error(message, 401)
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = ERROR_MESSAGES.FORBIDDEN) {
  return error(message, 403)
}

/**
 * Create a 404 Not Found response
 */
export function notFound(message = ERROR_MESSAGES.NOT_FOUND) {
  return error(message, 404)
}

/**
 * Create a 429 Rate Limited response
 */
export function rateLimited(retryAfter = 60) {
  return NextResponse.json(
    { success: false, message: ERROR_MESSAGES.RATE_LIMITED },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) }
    }
  )
}

/**
 * Validate required fields in request body
 * Returns null if valid, error response if invalid
 */
export function validateRequired(body, requiredFields) {
  const missing = requiredFields.filter(field => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    return error(ERROR_MESSAGES.MISSING_FIELDS, 400)
  }

  return null
}

// Helper function
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
