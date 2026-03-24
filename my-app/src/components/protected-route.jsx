"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthSkeleton } from "@/components/skeletons"

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname)
      router.push(`/login?returnUrl=${returnUrl}`)
    } else {
      setIsAuthenticated(true)
    }

    setIsLoading(false)
  }, [router, pathname])

  if (isLoading) {
    return <AuthSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
