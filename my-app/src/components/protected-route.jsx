"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"

export default function ProtectedRoute({ children }) {
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname)
      router.push(`/login?returnUrl=${returnUrl}`)
    }

    if (!isLoading) {
      setIsReady(true)
    }
  }, [isAuthenticated, isLoading, router, pathname])

  if (isLoading || !isReady) {
    return <AuthSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
