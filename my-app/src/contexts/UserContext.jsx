"use client"

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const UserContext = createContext(undefined)

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/leaderboard',
]

// Check if a path matches public routes
function isPublicRoute(pathname) {
  // Exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true

  // Pattern matches for public content pages
  const publicPatterns = [
    /^\/movies\/[^/]+$/,
    /^\/tv\/[^/]+$/,
    /^\/tv\/[^/]+\/season\/[^/]+$/,
    /^\/actor\/[^/]+$/,
    /^\/communities$/,
    /^\/communities\/[^/]+$/,
    /^\/communities\/[^/]+\/posts\/[^/]+$/,
    /^\/reviews\/[^/]+\/[^/]+$/,
    /^\/cast$/,
    /^\/search$/,
    /^\/browse$/,
  ]

  return publicPatterns.some(pattern => pattern.test(pathname))
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Handle unauthorized (401) responses
  const handleUnauthorized = useCallback((returnUrl) => {
    setUser(null)

    // Only redirect if on a protected route
    if (!isPublicRoute(pathname)) {
      const loginUrl = returnUrl
        ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
        : '/login'
      router.push(loginUrl)
    }
  }, [pathname, router])

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated by making a request to profile endpoint
        const response = await fetch('/api/users/profile', {
          credentials: 'include', // Include cookies automatically
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setUser(data.data)
          }
        } else if (response.status === 401) {
          // Token might be expired, try to refresh
          try {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            })

            if (refreshResponse.ok) {
              // Token refreshed, try profile again
              const retryResponse = await fetch('/api/users/profile', {
                credentials: 'include',
              })

              if (retryResponse.ok) {
                const data = await retryResponse.json()
                if (data.success && data.data) {
                  setUser(data.data)
                }
              } else {
                setUser(null)
              }
            } else {
              // Refresh failed, user needs to log in
              setUser(null)
            }
          } catch {
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function - only handles user data, tokens are in httpOnly cookies
  const login = (token, userData, rememberMe = false) => {
    // Note: token parameter is kept for backward compatibility but not used
    // Authentication is now handled entirely through httpOnly cookies
    setUser(userData)
  }

  // Logout function - calls server-side logout to clear cookies
  const logout = useCallback(async () => {
    try {
      // Call server-side logout endpoint to clear auth cookies
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if API call fails
    }

    setUser(null)
    router.push('/login')
  }, [router])

  // Update user function - only updates state, no localStorage
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData }
    setUser(updatedUser)
  }

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/users/profile', {
        credentials: 'include', // Use cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          updateUser(data.data)
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        handleUnauthorized(pathname)
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }, [handleUnauthorized, pathname])

  // Authenticated fetch wrapper that handles 401s and automatic token refresh
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...(options.body && !(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
      body: options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
    }

    try {
      const response = await fetch(url, fetchOptions)

      // Handle 401 responses with automatic token refresh
      if (response.status === 401) {
        // Try to refresh the token first
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })

          if (refreshResponse.ok) {
            // Token refreshed successfully, retry original request
            const retryResponse = await fetch(url, fetchOptions)

            if (retryResponse.status === 401) {
              // Still getting 401 after refresh, user needs to log in
              handleUnauthorized(pathname)
              return {
                ok: false,
                status: 401,
                error: 'Authentication failed'
              }
            }

            return retryResponse
          } else {
            // Refresh failed, user needs to log in
            handleUnauthorized(pathname)
            return {
              ok: false,
              status: 401,
              error: 'Session expired. Please log in again.'
            }
          }
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError)
          handleUnauthorized(pathname)
          return {
            ok: false,
            status: 401,
            error: 'Authentication failed'
          }
        }
      }

      return response
    } catch (error) {
      console.error('Fetch error:', error)
      throw error
    }
  }, [handleUnauthorized, pathname])

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUser,
    authFetch,
    handleUnauthorized,
    isAuthenticated: !!user,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
