"use server"

import { createServerClientSSR } from "@supabase/ssr"
import { redirect } from "next/navigation"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"
import { createAppCookieOperations } from "@/lib/cookies-utils"

// Create a server-side Supabase client (only for server actions)
const createServerActionClient = () => {
  const cookieOps = createAppCookieOperations()

  return createServerClientSSR<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: cookieOps,
  })
}

/**
 * Sign up a new user
 */
export async function signUp(formData: FormData) {
  try {
    const supabase = createServerActionClient()

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string

    // Validate inputs
    if (!email || !password || !name) {
      return { error: "All fields are required" }
    }

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError) {
      console.error("Error signing up:", authError)
      return { error: authError.message }
    }

    // Create a profile for the user
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        name,
        email,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Continue anyway, this is not critical
      }

      // Assign the free plan to the new user
      await assignFreePlan(authData.user.id)
    }

    return { success: true }
  } catch (error) {
    console.error("Error in signUp:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Assign the free plan to a new user
 */
async function assignFreePlan(userId: string) {
  try {
    const supabase = createServerActionClient()

    // Get the free plan
    const { data: plans, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", "Free")
      .limit(1)

    if (planError || !plans || plans.length === 0) {
      console.error("Error fetching free plan:", planError)
      return
    }

    const freePlan = plans[0]

    // Calculate the period start and end dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // Free plan is monthly

    // Create a subscription for the user with the free plan
    const { error } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: freePlan.id,
      interval: "monthly",
      status: "active",
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
    })

    if (error) {
      console.error("Error assigning free plan:", error)
    }
  } catch (error) {
    console.error("Error in assignFreePlan:", error)
  }
}

/**
 * Sign in a user
 */
export async function signIn(formData: FormData) {
  try {
    const supabase = createServerActionClient()

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Validate inputs
    if (!email || !password) {
      return { error: "Email and password are required" }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Error signing in:", error)
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in signIn:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Sign out a user
 */
export async function signOut() {
  try {
    const supabase = createServerActionClient()
    await supabase.auth.signOut()
    redirect("/login")
  } catch (error) {
    console.error("Error signing out:", error)
    redirect("/login")
  }
}
