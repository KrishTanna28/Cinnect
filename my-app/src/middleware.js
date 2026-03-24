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
    /^\/reviews\/[^/]+\/[^/]+$/, // Reviews pages
    /^\/cast$/,               // Cast page
    /^\/search$/,             // Search page
    /^\/browse$/,             // Browse page
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
    '/api/users/leaderboard',

    // Public content endpoints
    '/api/leaderboard',
    '/api/movies/popular',
    '/api/movies/trending',
    '/api/movies/top-rated',
    '/api/movies/genres',
    '/api/movies/discover',
    '/api/movies/search',
    '/api/spoiler-detect',
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
 * Extract token from request
 */
function getToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Try cookie (for Google OAuth flow)
  const cookies = request.cookies
  const tokenCookie = cookies.get('auth_token')
  if (tokenCookie) {
    return tokenCookie.value
  }

  return null
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions (images, etc.)
  ) {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith('/api/')

  // Check if this is a public route
  if (isPublicRoute(pathname, isApiRoute, method)) {
    return NextResponse.next()
  }

  // Protected route - verify authentication
  const token = getToken(request)

  if (!token) {
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

  // Verify the token
  const { valid, payload, error } = await verifyToken(token)

  if (!valid) {
    // Clear invalid token from cookies
    const response = isApiRoute
      ? NextResponse.json(
          { success: false, message: 'Session expired. Please log in again' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url))

    // Clear the auth cookie if it exists
    response.cookies.delete('auth_token')

    return response
  }

  // Token is valid - add user info to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)

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
