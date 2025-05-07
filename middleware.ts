import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient as createServerClientSSR } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  try {
    // Create a response object
    const response = NextResponse.next()

    // Create a Supabase client configured to use cookies
    const supabase = createServerClientSSR(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Only set cookies in the response, not in the request
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            // Only remove cookies from the response, not from the request
            response.cookies.delete({
              name,
              ...options,
            })
          },
        },
      },
    )

    // Get the current user's session
    let session = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (error) {
      console.error("Error getting session in middleware:", error)
      // Continue with null session
    }

    // If user is not logged in and trying to access a protected route
    const protectedPaths = ["/dashboard", "/billing", "/settings"]
    const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

    if (!session && isProtectedPath) {
      // Redirect to login page
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is logged in and trying to access auth pages
    const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"]
    const isAuthPath = authPaths.some((path) => request.nextUrl.pathname === path)

    if (session && isAuthPath) {
      // Redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Check if the user has a subscription
    if (session && isProtectedPath) {
      try {
        // Check if the user has a subscription
        const { data: subscription, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .single()

        // If no subscription, create a free plan subscription
        if (!subscription && !error) {
          console.log("No subscription found, creating free plan subscription")

          // Get the free plan
          const { data: plans } = await supabase.from("subscription_plans").select("*").eq("name", "Free").limit(1)

          const freePlan = plans?.[0]

          if (freePlan) {
            // Calculate the period start and end dates
            const startDate = new Date()
            const endDate = new Date()
            endDate.setMonth(endDate.getMonth() + 1) // Free plan is monthly

            // Create a subscription for the user with the free plan
            const { error: insertError } = await supabase.from("subscriptions").insert({
              user_id: session.user.id,
              plan_id: freePlan.id,
              interval: "monthly",
              status: "active",
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
            })

            if (insertError) {
              console.error("Error creating free subscription:", insertError)
            }
          } else {
            console.error("Free plan not found")
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
      }
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // If there's an error in the middleware, allow the request to continue
    // The app will handle authentication state appropriately
    return NextResponse.next()
  }
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes that handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}
