/**
 * Cookie utilities for authentication token management
 * Implements proper session control via cookie persistence based on "Remember Me" functionality
 */

/**
 * Builds a Set-Cookie header string
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {object} options - Cookie options
 * @returns {string} Set-Cookie header value
 */
function buildCookieString(name, value, options = {}) {
  const parts = [`${name}=${value}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  if (options.path) {
    parts.push(`Path=${options.path}`)
  }

  if (options.httpOnly) {
    parts.push('HttpOnly')
  }

  if (options.secure) {
    parts.push('Secure')
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  return parts.join('; ')
}

/**
 * Sets authentication cookies with proper security settings
 * Uses explicit Set-Cookie headers for maximum compatibility
 * @param {NextResponse} response - The Next.js response object
 * @param {string} accessToken - The JWT access token
 * @param {string} refreshToken - The JWT refresh token
 * @param {boolean} rememberMe - Whether to create persistent cookies or session cookies
 */
export function setAuthCookies(response, accessToken, refreshToken, rememberMe = false) {
  const isProduction = process.env.NODE_ENV === 'production'

  const baseOptions = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax'
  }

  if (rememberMe) {
    // Persistent cookies - 7 days
    const persistentOptions = {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    }

    const authCookie = buildCookieString('auth_token', accessToken, persistentOptions)
    const refreshCookie = buildCookieString('refresh_token', refreshToken, persistentOptions)

    response.headers.append('Set-Cookie', authCookie)
    response.headers.append('Set-Cookie', refreshCookie)
  } else {
    // Session cookies - no Max-Age means browser deletes on close
    const authCookie = buildCookieString('auth_token', accessToken, baseOptions)
    const refreshCookie = buildCookieString('refresh_token', refreshToken, baseOptions)

    response.headers.append('Set-Cookie', authCookie)
    response.headers.append('Set-Cookie', refreshCookie)
  }
}

/**
 * Clears authentication cookies (for logout)
 * @param {NextResponse} response - The Next.js response object
 */
export function clearAuthCookies(response) {
  const isProduction = process.env.NODE_ENV === 'production'

  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: 0 // Immediate expiry
  }

  const authCookie = buildCookieString('auth_token', '', clearOptions)
  const refreshCookie = buildCookieString('refresh_token', '', clearOptions)

  response.headers.append('Set-Cookie', authCookie)
  response.headers.append('Set-Cookie', refreshCookie)
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
