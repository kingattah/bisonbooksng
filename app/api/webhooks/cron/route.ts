import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClientSSR } from "@supabase/ssr"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"

// Create a server-side Supabase client for API routes
const createApiClient = () => {
  return createServerClientSSR<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get() {
        return undefined
      },
      set() {},
      remove() {},
    },
  })
}

// Check for expired subscriptions and downgrade them
async function checkExpiredSubscriptions() {
  try {
    const supabase = createApiClient()

    // Get current date
    const now = new Date().toISOString()

    // Find all active subscriptions that have expired
    const { data: expiredSubscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("status", "active")
      .lt("current_period_end", now)
      .not("cancel_at_period_end", "eq", true) // Exclude already cancelled subscriptions

    if (error) {
      console.error("Error finding expired subscriptions:", error)
      return { success: false, error: error.message, count: 0 }
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return { success: true, count: 0 }
    }

    // Get the free plan
    const { data: plans, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", "Free")
      .limit(1)

    if (planError || !plans || plans.length === 0) {
      console.error("Error fetching free plan:", planError)
      return { success: false, error: "Free plan not found", count: 0 }
    }

    const freePlan = plans[0]

    // Update each expired subscription to the free plan
    let updatedCount = 0
    for (const subscription of expiredSubscriptions) {
      // Calculate new period dates
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // Free plan is monthly

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: freePlan.id,
          status: "active", // Keep it active but with the free plan
          interval: "monthly",
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (!updateError) {
        updatedCount++
      } else {
        console.error(`Error updating subscription ${subscription.id}:`, updateError)
      }
    }

    return { success: true, count: updatedCount }
  } catch (error) {
    console.error("Error in checkExpiredSubscriptions:", error)
    return { success: false, error: (error as Error).message, count: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Optional: Verify the token against a stored secret
    // const token = authHeader.split(" ")[1]
    // if (token !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    // }

    // Check for expired subscriptions and downgrade them
    const result = await checkExpiredSubscriptions()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${result.count} expired subscriptions`,
    })
  } catch (error) {
    console.error("Error in cron handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
