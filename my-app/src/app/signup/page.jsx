"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, User, UserCircle, Film, Gift, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/UserContext"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    referralCode: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showOTPStep, setShowOTPStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [registrationId, setRegistrationId] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useUser()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ""
      })
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/users/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationId, otp }),
      })

      const data = await response.json()

      if (data.success) {
        // Save token and user data using context
        login(data.data.token, data.data.user)
        
        // Show welcome bonus notification
        if (data.data.welcomeBonus) {
          toast({
            variant: "success",
            title: "🎁 Welcome Bonus!",
            description: `You received ${data.data.welcomeBonus.points} points as a welcome gift!`,
            duration: 5000,
          })
        }
        
        // Show referral reward if applicable
        if (data.data.referralReward && data.data.referralReward.success) {
          setTimeout(() => {
            toast({
              variant: "success",
              title: "🎉 Referral Bonus!",
              description: `You and ${data.data.referralReward.referrerName} both received ${data.data.referralReward.pointsAwarded} points!`,
              duration: 5000,
            })
          }, 1500)
        }
        
        // Show success message
        setTimeout(() => {
          toast({
            variant: "success",
            title: "✅ Registration Complete!",
            description: "Welcome to Cinnect! Check your email for more details.",
            duration: 5000,
          })
        }, 3000)
        
        // Redirect to home
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1000)
      } else {
        setError(data.message || "OTP verification failed. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("OTP verification error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    setIsLoading(true)


    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // Store registration ID
        setRegistrationId(data.data.registrationId)
        
        // Show OTP sent message
        toast({
          variant: "success",
          title: "📧 OTP Sent!",
          description: `A 6-digit OTP has been sent to your email. Please check your inbox to complete registration.`,
          duration: 5000,
        })
        
        // Show OTP verification step
        setShowOTPStep(true)
      } else {
        // Check if there are field-specific errors
        if (data.errors && Array.isArray(data.errors)) {
          const errors = {}
          data.errors.forEach(err => {
            errors[err.field] = err.message
          })
          setFieldErrors(errors)
        } else {
          setError(data.message || "Registration failed. Please try again.")
        }
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Signup error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join Cinnect and start your journey</p>
        </div>

        {/* Signup Form or OTP Verification */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          {!showOTPStep ? (
            <>
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={() => window.location.href = '/api/auth/google'}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg border-2 border-gray-200 transition-colors mb-6 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  className={`pl-10 ${fieldErrors.username ? 'border-destructive' : ''}`}
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (Optional)</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`pl-10 ${fieldErrors.fullName ? 'border-destructive' : ''}`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-10 ${fieldErrors.email ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={`pl-10 pr-10 ${fieldErrors.password ? 'border-destructive' : ''}`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              )}
            </div>

            {/* Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode">Have a Referral Code? (Optional)</Label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  placeholder="Enter friend's referral code"
                  value={formData.referralCode}
                  onChange={handleChange}
                  className={`pl-10 ${fieldErrors.referralCode ? 'border-destructive' : ''}`}
                />
              </div>
              {fieldErrors.referralCode ? (
                <p className="text-xs text-destructive">{fieldErrors.referralCode}</p>
              ) : (
                <p className="text-xs text-primary font-medium">🎁 Both you and your friend get 200 points!</p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          </>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              {/* OTP Verification Step */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h2>
                <p className="text-muted-foreground">
                  We've sent a 6-digit OTP to<br />
                  <span className="font-medium text-foreground">{formData.email}</span>
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground text-center">Enter the 6-digit code sent to your mobile</p>
              </div>

              {/* Verify Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline cursor-pointer"
                  onClick={() => {
                    toast({
                      title: "OTP Resent",
                      description: "A new OTP has been sent to your mobile number.",
                    })
                  }}
                >
                  Didn't receive OTP? Resend
                </button>
              </div>
            </form>
          )}


          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
