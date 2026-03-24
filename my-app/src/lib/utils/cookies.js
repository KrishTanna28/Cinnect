/**
 * Cookie utilities for authentication token management
 * Implements proper session control via cookie persistence based on "Remember Me" functionality
 */

/**
 * Sets authentication cookies with proper security settings
 * @param {NextResponse} response - The Next.js response object
 * @param {string} accessToken - The JWT access token
 * @param {string} refreshToken - The JWT refresh token
 * @param {boolean} rememberMe - Whether to create persistent cookies or session cookies
 */
export function setAuthCookies(response, accessToken, refreshToken, rememberMe = false) {
  const cookieSettings = {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
    path: '/' // Available site-wide
  }

  if (rememberMe) {
    // Persistent cookies - 7 days
    // These will persist across browser sessions until expiry
    response.cookies.set('auth_token', accessToken, {
      ...cookieSettings,
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    })
    response.cookies.set('refresh_token', refreshToken, {
      ...cookieSettings,
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    })
  } else {
    // Session cookies - expire on browser close
    // No maxAge means they're deleted when the browser closes
    response.cookies.set('auth_token', accessToken, cookieSettings)
    response.cookies.set('refresh_token', refreshToken, cookieSettings)
  }
}

/**
 * Clears authentication cookies (for logout)
 * @param {NextResponse} response - The Next.js response object
 */
export function clearAuthCookies(response) {
  const cookieSettings = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Changed from 'strict' to 'lax' for consistency
    path: '/'
  }

  // Set cookies to empty with immediate expiry
  response.cookies.set('auth_token', '', {
    ...cookieSettings,
    maxAge: 0
  })
  response.cookies.set('refresh_token', '', {
    ...cookieSettings,
    maxAge: 0
  })
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