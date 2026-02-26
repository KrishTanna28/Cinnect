"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Lock, Eye, EyeOff, Film, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setError("Invalid or missing reset token")
    } else {
      setTokenValid(true)
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Validate passwords
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        setError(data.message || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Reset password error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center text-destructive-foreground mb-4">
            </div>
            <h1 className="text-3xl font-bold text-foreground">Invalid Link</h1>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm mb-6">
              <p className="font-semibold mb-1">Invalid or Expired Link</p>
              <p className="text-destructive/80">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>

            <Link href="/forgot-password">
              <Button className="w-full">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-4">
          </div>
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Enter your new password below
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          {success ? (
            <div className="space-y-6">
              {/* Success Message */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h2>
                  <p className="text-muted-foreground">
                    Your password has been successfully reset.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Redirecting to login page...
                  </p>
                </div>
              </div>

              {/* Login Button */}
              <Link href="/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters with uppercase, lowercase, and number
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Link href="/login" className="text-sm text-primary hover:underline cursor-pointer">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By continuing, you agree to Cinnect's{" "}
          <Link href="/terms" className="underline hover:text-foreground cursor-pointer">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground cursor-pointer">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
