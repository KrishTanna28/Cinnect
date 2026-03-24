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
    /^\/profile\/[^/]+$/,
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
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)

    // Only redirect if on a protected route
    if (!isPublicRoute(pathname)) {
      const loginUrl = returnUrl
        ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
        : '/login'
      router.push(loginUrl)
    }
  }, [pathname, router])

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (token && userData) {
          setUser(JSON.parse(userData))
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        // Clear invalid data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login function
  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }, [router])

  // Update user function
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Authenticated fetch wrapper that handles 401s
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token')

    const headers = {
      ...(options.body && !(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    }

    const fetchOptions = {
      ...options,
      headers,
      body: options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
    }

    try {
      const response = await fetch(url, fetchOptions)

      // Handle 401 responses
      if (response.status === 401) {
        handleUnauthorized(pathname)
        return {
          ok: false,
          status: 401,
          error: 'Please log in to continue'
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
