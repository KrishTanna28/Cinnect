"use client"

import { createContext, useContext, useEffect, useRef } from 'react'
import { useUser } from './UserContext'
import { useRouter } from 'next/navigation'

const AuthRefreshContext = createContext()

export function AuthRefreshProvider({ children }) {
  const { user, logout } = useUser()
  const router = useRouter()
  const refreshIntervalRef = useRef(null)

  useEffect(() => {
    // Only set up refresh if user is logged in
    if (!user) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    // Keep session alive by rotating cookies on an interval.
    const checkAndRefreshToken = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          // Refresh token is invalid/expired; clear local auth state.
          logout()
          router.push('/login')
        }
      } catch (error) {
        console.error('Token refresh check error:', error)
        logout()
        router.push('/login')
      }
    }

    // Check immediately
    checkAndRefreshToken()

    // Then check every 5 minutes
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 5 * 60 * 1000)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [user, logout, router])

  return (
    <AuthRefreshContext.Provider value={{}}>
      {children}
    </AuthRefreshContext.Provider>
  )
}

export const useAuthRefresh = () => useContext(AuthRefreshContext)
