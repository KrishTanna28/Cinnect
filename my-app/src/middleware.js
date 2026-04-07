import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Centralized Authentication Middleware
 *
 * Enforces authentication across the entire application:
 * - Public routes: home page, auth flows, public content
 * - Protected routes: everything else requires authentication
 * - API routes without auth → 401 JSON response
 * - Page routes without auth → redirect to /login
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = {
  // Auth pages and flows
  pages: [
    '/',                      // Home page (landing)
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/leaderboard',           // Public leaderboard
  ],
  // Patterns for dynamic public pages
  pagePatterns: [
    /^\/movies\/[^/]+$/,      // /movies/[id] - movie details
    /^\/tv\/[^/]+$/,          // /tv/[id] - TV show details
    /^\/tv\/[^/]+\/season\/[^/]+$/, // /tv/[id]/season/[seasonNumber]
    /^\/actor\/[^/]+$/,       // /actor/[id] - actor details
    /^\/profile\/[^/]+$/,     // /profile/[id] - public user profiles
    /^\/communities$/,        // Communities list
    /^\/communities\/[^/]+$/, // Community details
    /^\/communities\/[^/]+\/posts\/[^/]+$/, // Post details
    /^\/cast$/,               // Cast page
    /^\/search$/,             // Search page
    /^\/terms$/,              // Terms of Service page
    /^\/privacy$/,            // Privacy Policy page
  ],
  // API routes that don't require authentication
  api: [
    // Auth endpoints
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/refresh',

    // User auth endpoints
    '/api/users/login',
    '/api/users/register',
    '/api/users/complete-registration',
    '/api/users/forgot-password',
    '/api/users/reset-password',
    '/api/users/logout',
    '/api/users/leaderboard',
    '/api/users/profile',  // Let route handler manage auth (supports token refresh)
    '/api/recommendations/all',  // Let route handler manage auth (supports token refresh)

    // Public content endpoints
    '/api/leaderboard',
    '/api/movies/popular',
    '/api/movies/trending',
    '/api/movies/top-rated',
    '/api/movies/genres',
    '/api/movies/discover',
    '/api/movies/search',
    '/api/spoiler-detect',
    '/api/news',
  ],
  // API patterns for dynamic public routes
  apiPatterns: [
    /^\/api\/movies\/[^/]+$/,           // /api/movies/[id]
    /^\/api\/movies\/person\/[^/]+$/,   // /api/movies/person/[id]
    /^\/api\/movies\/tv\/.+$/,          // All TV API routes
    /^\/api\/movies\/search\/.+$/,      // All search routes
    /^\/api\/users\/leaderboard$/,      // Leaderboard
    /^\/api\/reviews$/,                 // GET reviews (list)
    /^\/api\/reviews\/[^/]+$/,          // GET review details
    /^\/api\/reviews\/user\/[^/]+$/,    // GET user reviews
    /^\/api\/communities$/,             // GET communities (list)
    /^\/api\/communities\/search$/,     // Search communities
    /^\/api\/communities\/posts$/,      // GET community posts
    /^\/api\/communities\/[^/]+$/,      // GET community details
    /^\/api\/communities\/[^/]+\/members$/, // GET community members
    /^\/api\/communities\/[^/]+\/posts$/, // GET community posts
    /^\/api\/posts\/[^/]+$/,            // GET post details
    /^\/api\/users\/[^/]+$/,            // GET user profile
    /^\/api\/users\/[^/]+\/followers$/, // GET user followers
    /^\/api\/users\/[^/]+\/following$/, // GET user following
    /^\/api\/content\/[^/]+\/[^/]+\/providers$/, // GET streaming providers
    /^\/api\/cron\/.+$/,                // Cron jobs (will be protected by secret)
    /^\/api\/notifications\/generate-all$/, // Cron notification job
  ],
}

// Methods that are typically safe for public access on mixed endpoints
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * Check if a route is public
 */
function isPublicRoute(pathname, isApiRoute, method) {
  if (isApiRoute) {
    // Check exact matches
    if (PUBLIC_ROUTES.api.includes(pathname)) {
      return true
    }

    // Check patterns
    for (const pattern of PUBLIC_ROUTES.apiPatterns) {
      if (pattern.test(pathname)) {
        // For API routes with patterns, only GET requests are public
        // POST/PUT/DELETE typically require auth
        return SAFE_METHODS.includes(method)
      }
    }

    return false
  } else {
    // Check exact page matches
    if (PUBLIC_ROUTES.pages.includes(pathname)) {
      return true
    }

    // Check page patterns
    for (const pattern of PUBLIC_ROUTES.pagePatterns) {
      if (pattern.test(pathname)) {
        return true
      }
    }

    return false
  }
}

/**
 * Verify JWT token
 */
async function verifyToken(token) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured')
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

/**
 * Extract candidate auth tokens from request.
 * Header token is checked first, but cookie token is preserved as fallback.
 */
function getAuthTokens(request) {
  const tokens = []

  // Authorization header token
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.replace('Bearer ', '').trim()
    if (headerToken) tokens.push({ token: headerToken, source: 'header' })
  }

  // Cookie auth token
  const authCookie = request.cookies.get('auth_token')
  if (authCookie?.value) {
    const cookieToken = authCookie.value.trim()
    if (cookieToken && !tokens.some(t => t.token === cookieToken)) {
      tokens.push({ token: cookieToken, source: 'cookie' })
    }
  }

  return tokens
}

/**
 * Validate auth token candidates (header/cookie) and return first valid payload.
 */
async function getValidAuthPayload(request) {
  const candidates = getAuthTokens(request)

  for (const { token, source } of candidates) {
    const result = await verifyToken(token)
    if (result.valid) {
      return { valid: true, payload: result.payload, source }
    }
  }

  return { valid: false }
}

/**
 * Validate refresh token cookie so expired access tokens do not force logout.
 */
async function getValidRefreshPayload(request) {
  const refreshToken = request.cookies.get('refresh_token')?.value
  if (!refreshToken) return { valid: false }
  return verifyToken(refreshToken)
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const method = request.method

  const AUTH_PAGES = ['/login', '/signup']

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions (images, etc.)
  ) {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith('/api/')

  // Prevent authenticated users from visiting auth pages.
  if (!isApiRoute && AUTH_PAGES.includes(pathname)) {
    const authResult = await getValidAuthPayload(request)
    const refreshResult = authResult.valid ? { valid: false } : await getValidRefreshPayload(request)

    if (authResult.valid || refreshResult.valid) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Check if this is a public route
  if (isPublicRoute(pathname, isApiRoute, method)) {
    return NextResponse.next()
  }

  // Protected route - verify authentication
  const authCandidates = getAuthTokens(request)
  const hasRefreshCookie = !!request.cookies.get('refresh_token')?.value

  if (!authCandidates.length && !hasRefreshCookie) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: 'Please log in to continue' },
        { status: 401 }
      )
    } else {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Try header/cookie access token first
  const authResult = await getValidAuthPayload(request)

  // Fallback to refresh token for smoother session continuity
  const refreshResult = authResult.valid ? { valid: false } : await getValidRefreshPayload(request)
  const authPayload = authResult.valid ? authResult.payload : (refreshResult.valid ? refreshResult.payload : null)
  const isValid = !!authPayload

  if (!isValid) {
    // Clear invalid token from cookies
    const response = isApiRoute
      ? NextResponse.json(
          { success: false, message: 'Session expired. Please log in again' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url))

    // Clear auth cookies if both access and refresh are invalid
    response.cookies.delete('auth_token')
    response.cookies.delete('refresh_token')

    return response
  }

  // Token is valid - add user info to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', authPayload.userId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
