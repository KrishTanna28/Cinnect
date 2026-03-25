import jwt from 'jsonwebtoken'

/**
 * Generate short-lived access token
 * @param {string} userId - User ID
 * @returns {string} JWT access token (15 minutes)
 */
export const generateAccessToken = (userId) => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || '15m'

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  )
}

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @param {string} tokenId - Unique token identifier
 * @param {boolean} rememberMe - If true, token lasts 30 days; if false, 1 day (for session use)
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId, tokenId, rememberMe = false) => {
  // For "Remember Me": 30 days, otherwise: 1 day (will be used with session cookies)
  const expiresIn = rememberMe
    ? (process.env.REFRESH_TOKEN_EXPIRY_REMEMBER || '30d')
    : (process.env.REFRESH_TOKEN_EXPIRY || '1d')

  return jwt.sign(
    { userId, tokenId, rememberMe }, // Include rememberMe in payload for refresh endpoint
    process.env.JWT_SECRET,
    { expiresIn }
  )
}

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

// Deprecated: Use generateAccessToken and generateRefreshToken instead
export const generateToken = (userId, rememberMe = false) => {
  console.warn('generateToken is deprecated. Use generateAccessToken and generateRefreshToken instead.')
  return generateAccessToken(userId)
}

// Deprecated: Use verifyAccessToken or verifyRefreshToken instead
export const verifyToken = (token) => {
  console.warn('verifyToken is deprecated. Use verifyAccessToken or verifyRefreshToken instead.')
  return verifyAccessToken(token)
}
