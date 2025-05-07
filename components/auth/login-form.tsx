"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { PasswordResetDialog } from "@/components/auth/password-reset-dialog"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean
    title: string
    description: React.ReactNode
    action?: {
      label: string
      onClick: () => void
    }
  }>({
    open: false,
    title: "",
    description: "",
  })
  const router = useRouter()
  const { toast } = useToast()

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      console.log("Starting Google OAuth sign-in...")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Google OAuth error:", error)
        setErrorDialog({
          open: true,
          title: "Google Sign-in Failed",
          description: (
            <div className="space-y-2">
              <p>Unable to sign in with Google.</p>
              <p className="text-sm text-muted-foreground">Please try again or use email sign-in instead.</p>
            </div>
          ),
        })
        return
      }

      console.log("OAuth response:", data)

      if (data?.url) {
        console.log("Redirecting to:", data.url)
        window.location.href = data.url
        return
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setErrorDialog({
        open: true,
        title: "Google Sign-in Error",
        description: (
          <div className="space-y-2">
            <p>An unexpected error occurred during Google sign-in.</p>
            <p className="text-sm text-muted-foreground">Please try again or use email sign-in instead.</p>
          </div>
        ),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    console.log("Login attempt started")

    const supabase = createClient()

    try {
      console.log("Attempting to sign in with:", { email })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("Sign in response:", { data, error })

      if (error) {
        console.log("Login error:", error)
        if (error.message.includes("Email not confirmed")) {
          setErrorDialog({
            open: true,
            title: "Email Verification Required",
            description: (
              <div className="space-y-2">
                <p>Please verify your email address before logging in.</p>
                <p className="text-sm text-muted-foreground">Check your inbox for the verification link.</p>
              </div>
            ),
            action: {
              label: "Resend Verification",
              onClick: async () => {
                try {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email,
                  })
                  if (error) throw error
                  toast({
                    title: "Verification Email Sent",
                    description: "Please check your inbox for the verification link.",
                  })
                } catch (error) {
                  console.error("Error resending verification:", error)
                }
              },
            },
          })
          return
        } else if (error.message.includes("Invalid login credentials")) {
          setErrorDialog({
            open: true,
            title: "Invalid Credentials",
            description: (
              <div className="space-y-2">
                <p>The email or password you entered is incorrect.</p>
                <p className="text-sm text-muted-foreground">Please check your credentials and try again.</p>
              </div>
            ),
          })
          return
        } else if (error.message.includes("rate limit")) {
          setErrorDialog({
            open: true,
            title: "Too Many Attempts",
            description: (
              <div className="space-y-2">
                <p>Too many login attempts detected.</p>
                <p className="text-sm text-muted-foreground">Please wait a few minutes before trying again.</p>
              </div>
            ),
          })
          return
        } else {
          setErrorDialog({
            open: true,
            title: "Login Error",
            description: (
              <div className="space-y-2">
                <p>An unexpected error occurred.</p>
                <p className="text-sm text-muted-foreground">Please try again or contact support if the problem persists.</p>
              </div>
            ),
          })
          return
        }
      }

      if (data.user && !data.user.email_confirmed_at) {
        console.log("Email not confirmed for user:", data.user)
        setErrorDialog({
          open: true,
          title: "Email Verification Required",
          description: (
            <div className="space-y-2">
              <p>Please verify your email address before logging in.</p>
              <p className="text-sm text-muted-foreground">Check your inbox for the verification link.</p>
            </div>
          ),
          action: {
            label: "Resend Verification",
            onClick: async () => {
              try {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email,
                })
                if (error) throw error
                toast({
                  title: "Verification Email Sent",
                  description: "Please check your inbox for the verification link.",
                })
              } catch (error) {
                console.error("Error resending verification:", error)
              }
            },
          },
        })
        return
      }

      console.log("Login successful, redirecting to dashboard")
      toast({
        title: "Welcome Back!",
        description: "Successfully logged in to Bison Books Invoicing.",
        duration: 3000,
      })

      router.replace("/dashboard")
    } catch (error: any) {
      console.error("Login error caught:", error)
      setErrorDialog({
        open: true,
        title: "Login Failed",
        description: (
          <div className="space-y-2">
            <p>Unable to complete login.</p>
            <p className="text-sm text-muted-foreground">Please try again or contact support if the problem persists.</p>
          </div>
        ),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <div className="grid gap-6">
      <form onSubmit={handleLogin}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowResetDialog(true)}
                  className="text-xs text-primary hover:underline"
                >
                Forgot password?
                </button>
            </div>
            <div className="relative">
              <LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember me
            </label>
          </div>
          <Button disabled={isLoading} type="submit" className="w-full">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleLogin}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Google
      </Button>
    </div>

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        action={errorDialog.action}
      />

      <PasswordResetDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
      />
    </>
  )
}
