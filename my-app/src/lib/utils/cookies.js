/**
 * Cookie utilities for authentication token management
 * Implements proper session control via cookie persistence based on "Remember Me" functionality
 */

/**
 * Sets authentication cookies with proper security settings
 * Uses Next.js cookies API for reliable cookie handling across all response types
 * @param {NextResponse} response - The Next.js response object
 * @param {string} accessToken - The JWT access token
 * @param {string} refreshToken - The JWT refresh token
 * @param {boolean} rememberMe - Whether to create persistent cookies or session cookies
 */
export function setAuthCookies(response, accessToken, refreshToken, rememberMe = false) {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieDomain = process.env.COOKIE_DOMAIN
  const rawSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase()
  const sameSite = ['lax', 'strict', 'none'].includes(rawSameSite) ? rawSameSite : 'lax'
  const cookieSecureEnv = process.env.COOKIE_SECURE
  const secure = cookieSecureEnv === 'true'
    ? true
    : cookieSecureEnv === 'false'
      ? false
      : isProduction

  const baseOptions = {
    path: '/',
    httpOnly: true,
    secure,
    sameSite,
    ...(cookieDomain ? { domain: cookieDomain } : {})
  }

  if (rememberMe) {
    // Persistent cookies - 30 days (matches refresh token expiry)
    const persistentOptions = {
      ...baseOptions,
      maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
    }

    response.cookies.set('auth_token', accessToken, persistentOptions)
    response.cookies.set('refresh_token', refreshToken, persistentOptions)
  } else {
    // Session cookies - no maxAge means browser deletes on close
    response.cookies.set('auth_token', accessToken, baseOptions)
    response.cookies.set('refresh_token', refreshToken, baseOptions)
  }
}

/**
 * Clears authentication cookies (for logout)
 * @param {NextResponse} response - The Next.js response object
 */
export function clearAuthCookies(response) {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieDomain = process.env.COOKIE_DOMAIN
  const rawSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase()
  const sameSite = ['lax', 'strict', 'none'].includes(rawSameSite) ? rawSameSite : 'lax'
  const cookieSecureEnv = process.env.COOKIE_SECURE
  const secure = cookieSecureEnv === 'true'
    ? true
    : cookieSecureEnv === 'false'
      ? false
      : isProduction

  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure,
    sameSite,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    maxAge: 0 // Immediate expiry
  }

  response.cookies.set('auth_token', '', clearOptions)
  response.cookies.set('refresh_token', '', clearOptions)
}

/**
 * Extracts auth token from request cookies
 * @param {NextRequest} request - The Next.js request object
 * @returns {string|null} The auth token or null if not found
 */
export function getAuthTokenFromCookies(request) {
  return request.cookies.get('auth_token')?.value || null
}

/**
 * Extracts refresh token from request cookies
 * @param {NextRequest} request - The Next.js request object
 * @returns {string|null} The refresh token or null if not found
 */
export function getRefreshTokenFromCookies(request) {
  return request.cookies.get('refresh_token')?.value || null
}
