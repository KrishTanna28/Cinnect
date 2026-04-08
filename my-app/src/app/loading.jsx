import { cookies } from "next/headers"
import { verifyAccessToken, verifyRefreshToken } from "@/lib/utils/jwt"
import { HomeSkeleton, LandingPageSkeleton } from "@/components/skeletons"

function hasValidSession(authToken, refreshToken) {
  if (!process.env.JWT_SECRET) {
    return !!(authToken || refreshToken)
  }

  if (authToken) {
    try {
      verifyAccessToken(authToken)
      return true
    } catch {}
  }

  if (refreshToken) {
    try {
      verifyRefreshToken(refreshToken)
      return true
    } catch {}
  }

  return false
}

export default async function Loading() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth_token")?.value || null
  const refreshToken = cookieStore.get("refresh_token")?.value || null
  const isAuthenticated = hasValidSession(authToken, refreshToken)

  return isAuthenticated ? <HomeSkeleton /> : <LandingPageSkeleton />
}
