"use server"

import { createServerClient } from "@/lib/supabase"
import { createPaymentLink, verifyPayment } from "@/lib/paystack"
import { revalidatePath } from "next/cache"

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  features: any
}

interface Subscription {
  id: string
  status: string
  current_period_end: string
  subscription_plans: {
    id: string
    name: string
    price: number
    features: any
  }
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans() {
  try {
    const supabase = createServerClient()

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true })

    if (error) {
      console.error("Error fetching subscription plans:", error)
      throw new Error("Failed to fetch subscription plans")
    }

    return plans || []
  } catch (error) {
    console.error("Error in getSubscriptionPlans:", error)
    throw new Error("Failed to fetch subscription plans")
  }
}

/**
 * Get user's current subscription
 */
export async function getUserSubscription() {
  try {
    const supabase = createServerClient()

    // Get the current user's session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session, return null without throwing an error
    if (!session || !session.user) {
      console.log("No authenticated user found in getUserSubscription")
      return null
    }

    // Get the user's subscription with no caching
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", session.user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is the error code for no rows returned
      console.error("Error fetching user subscription:", error)
    }

    // Log the subscription data for debugging
    console.log("getUserSubscription result:", subscription)

    return subscription || null
  } catch (error) {
    console.error("Error in getUserSubscription:", error)
    return null
  }
}

/**
 * Calculate the end date based on the start date and interval
 */
function calculateEndDate(startDate: Date, interval: string): Date {
  const endDate = new Date(startDate.getTime())
  if (interval === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1)
  } else {
    endDate.setMonth(endDate.getMonth() + 1)
  }
  return endDate
}

/**
 * Initialize a subscription
 */
export async function initializeSubscription(planId: string, interval = "monthly") {
  try {
    const supabase = createServerClient()

    // Get the current user's session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !session.user) {
      throw new Error("User not authenticated")
    }

    const user = session.user

    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !plan) {
      console.error("Error fetching plan:", planError)
      throw new Error("Plan not found")
    }

    // Check if the user already has a subscription
    const { data: existingSubscription, error: subscriptionQueryError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        current_period_end,
        subscription_plans!inner (
          id,
          name,
          price,
          features
        )
      `)
      .eq("user_id", user.id)
      .single()

    if (subscriptionQueryError && subscriptionQueryError.code !== "PGRST116") {
      console.error("Error checking existing subscription:", subscriptionQueryError)
      throw new Error("Failed to check existing subscription")
    }

    console.log("Existing subscription:", JSON.stringify(existingSubscription, null, 2))
    console.log("New plan:", JSON.stringify(plan, null, 2))

    let subscriptionId: string | undefined = undefined

    // If there's no existing subscription, allow creating a new one
    if (!existingSubscription) {
      console.log("No existing subscription, creating new one")
    } else {
      // Type assertion through unknown to handle the subscription plan data
      const subscriptionPlan = (existingSubscription.subscription_plans as unknown as { name: string })
      const currentPlanName = subscriptionPlan.name
      const isActive = existingSubscription.status === "active"
      const isNotExpired = new Date(existingSubscription.current_period_end) > new Date()
      const isFreePlan = currentPlanName === "Free"
      const isUpgradingToBasic = plan.name === "Basic"

      console.log("Subscription details:", {
        currentPlanName,
        isActive,
        isNotExpired,
        isFreePlan,
        isUpgradingToBasic,
        currentPeriodEnd: existingSubscription.current_period_end,
        currentStatus: existingSubscription.status
      })

      // Special case: Always allow upgrade from Free plan to Basic plan
      if (isFreePlan && isUpgradingToBasic) {
        console.log("Upgrading from Free to Basic plan")
        subscriptionId = existingSubscription.id
      } 
      // If user has an active paid subscription, prevent creating a new one
      else if (isActive && isNotExpired && !isFreePlan) {
        console.log("Active paid subscription found, preventing upgrade")
        throw new Error("You already have an active subscription. Please wait until it expires or cancel it first.")
      } 
      // If there's an existing subscription but it's not active, we'll update it
      else {
        console.log("Updating existing subscription")
        subscriptionId = existingSubscription.id
      }
    }

    // Calculate the price based on the interval
    const price = interval === "yearly" ? Math.round(plan.price * 12 * 0.9) : plan.price // 10% discount for yearly

    // Calculate the period start and end dates
    const startDate = new Date()
    const endDate = calculateEndDate(startDate, interval)

    const periodStart = startDate.toISOString()
    const periodEnd = endDate.toISOString()

    // If it's a free plan, update or create the subscription without payment
    if (plan.price === 0) {
      if (subscriptionId) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: plan.id,
            status: "active",
            interval: interval,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            canceled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId)

        if (updateError) {
          console.error("Error updating subscription:", updateError)
          throw new Error("Failed to update subscription")
        }
      } else {
        // Create new subscription
        const { data: newSubscription, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            interval: interval,
            status: "active",
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .select()
          .single()

        if (insertError) {
          console.error("Error creating subscription:", insertError)
          throw new Error("Failed to create subscription")
        }

        subscriptionId = newSubscription.id
      }

      revalidatePath("/billing")
      return { success: true, subscription: { id: subscriptionId } }
    }

    // For paid plans, update or create a pending subscription
    if (subscriptionId) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          interval: interval,
          status: "pending",
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (updateError) {
        console.error("Error updating subscription:", updateError)
        throw new Error("Failed to update subscription")
      }
    } else {
      // Create new subscription
      const { data: newSubscription, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          interval: interval,
          status: "pending",
          current_period_start: periodStart,
          current_period_end: periodEnd,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating subscription:", insertError)
        throw new Error("Failed to create subscription")
      }

      subscriptionId = newSubscription.id
    }

    // Create a callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const callbackUrl = `${appUrl}/billing/verify`

    // Create a payment link with the calculated price
    const paymentData = await createPaymentLink(
      user.email!,
      price,
      `${callbackUrl}?subscription_id=${subscriptionId}`,
      {
        subscription_id: subscriptionId,
        user_id: user.id,
        interval: interval,
      },
    )

    return {
      success: true,
      paymentUrl: paymentData.authorization_url,
      reference: paymentData.reference,
    }
  } catch (error) {
    console.error("Error in initializeSubscription:", error)
    throw error
  }
}

/**
 * Verify a subscription payment
 */
export async function verifySubscriptionPayment(reference: string, subscriptionId: string) {
  try {
    const supabase = createServerClient()

    console.log(`Verifying payment: reference=${reference}, subscriptionId=${subscriptionId}`)

    // Verify the payment
    const paymentData = await verifyPayment(reference)
    console.log("Payment verification data:", paymentData)

    if (paymentData.status !== "success") {
      console.error("Payment verification failed:", paymentData)
      throw new Error("Payment verification failed")
    }

    // Get the subscription to check the interval
    const { data: subscription, error: subscriptionFetchError } = await supabase
      .from("subscriptions")
      .select("interval, current_period_start, current_period_end, plan_id")
      .eq("id", subscriptionId)
      .single()

    if (subscriptionFetchError) {
      console.error("Error fetching subscription:", subscriptionFetchError)
      throw new Error("Failed to fetch subscription details")
    }

    // Use the existing period dates if available, otherwise calculate new ones
    let periodStart = subscription.current_period_start
    let periodEnd = subscription.current_period_end

    if (!periodStart || !periodEnd) {
      // Calculate new period dates
      const startDate = new Date()
      const endDate = calculateEndDate(startDate, subscription.interval)

      periodStart = startDate.toISOString()
      periodEnd = endDate.toISOString()
    }

    console.log("Period start:", periodStart)
    console.log("Period end:", periodEnd)

    // Update the subscription
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        paystack_authorization_code: paymentData.authorization?.authorization_code,
        paystack_customer_code: paymentData.customer?.customer_code,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq("id", subscriptionId)

    if (subscriptionError) {
      console.error("Error updating subscription:", subscriptionError)
      throw new Error("Failed to update subscription")
    }

    // Create a subscription invoice
    const { error: invoiceError } = await supabase.from("subscription_invoices").insert({
      subscription_id: subscriptionId,
      paystack_invoice_code: reference,
      amount: paymentData.amount / 100, // Convert from kobo to naira
      status: "paid",
      paid_at: new Date().toISOString(),
    })

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError)
      // Continue anyway, this is not critical
    }

    // Force a cache invalidation by updating a timestamp field
    const { error: cacheUpdateError } = await supabase
      .from("subscriptions")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)

    if (cacheUpdateError) {
      console.error("Error updating cache timestamp:", cacheUpdateError)
    }

    console.log("Subscription successfully activated!")

    revalidatePath("/billing")
    return { success: true }
  } catch (error) {
    console.error("Error in verifySubscriptionPayment:", error)
    throw error
  }
}

/**
 * Cancel a subscription
 */
export async function cancelUserSubscription() {
  try {
    const supabase = createServerClient()

    // Get the current user's session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !session.user) {
      throw new Error("User not authenticated")
    }

    const user = session.user

    // Get the user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (subscriptionError || !subscription) {
      console.error("Error fetching subscription:", subscriptionError)
      throw new Error("Subscription not found")
    }

    // Update the subscription in the database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      throw new Error("Failed to update subscription")
    }

    revalidatePath("/billing")
    return { success: true }
  } catch (error) {
    console.error("Error in cancelUserSubscription:", error)
    throw error
  }
}

/**
 * Refresh subscription data
 */
export async function refreshSubscriptionData() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Force refresh the subscription data
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select("*, subscription_plans(*)")
      .single()

    if (error) {
      console.error("Error refreshing subscription:", error)
      throw new Error("Failed to refresh subscription data")
    }

    // Revalidate all relevant paths
    revalidatePath("/receipts")
    revalidatePath("/billing")
    revalidatePath("/dashboard")

    return { success: true, data: subscription }
  } catch (error: any) {
    console.error("Error in refreshSubscriptionData:", error)
    return { success: false, error: error.message }
  }
}

// Let's add a function to check for expired subscriptions and handle them appropriately

/**
 * Check for expired subscriptions and downgrade them to free plan
 * This should be called by a scheduled job or webhook
 */
export async function checkExpiredSubscriptions() {
  try {
    const supabase = createServerClient()

    // Get all active subscriptions that have expired
    const now = new Date().toISOString()
    const { data: expiredSubscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, current_period_end")
      .eq("status", "active")
      .lt("current_period_end", now)
      .not("cancel_at_period_end", "eq", true) // Exclude already cancelled subscriptions

    if (error) {
      console.error("Error fetching expired subscriptions:", error)
      return { success: false, error: error.message }
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired subscriptions`)

    // Get the free plan
    const { data: freePlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("name", "Free")
      .single()

    if (planError || !freePlan) {
      console.error("Error fetching free plan:", planError)
      return { success: false, error: "Free plan not found" }
    }

    // Update each expired subscription to the free plan
    for (const subscription of expiredSubscriptions || []) {
      // Calculate new period dates
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // Free plan is monthly

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: freePlan.id,
          status: "active",
          interval: "monthly",
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (updateError) {
        console.error(`Error updating subscription ${subscription.id}:`, updateError)
      } else {
        console.log(`Downgraded subscription ${subscription.id} to free plan`)
      }
    }

    return { success: true, count: expiredSubscriptions?.length || 0 }
  } catch (error) {
    console.error("Error in checkExpiredSubscriptions:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Add a function to manually check subscription status for testing

/**
 * Check if a user's subscription has expired and downgrade if necessary
 * This can be used for testing or manual checks
 */
export async function checkUserSubscriptionStatus() {
  try {
    const supabase = createServerClient()

    // Get the current user's session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !session.user) {
      return { success: false, message: "Not authenticated" }
    }

    // Get the user's subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching subscription:", error)
      return { success: false, message: "Failed to fetch subscription" }
    }

    if (!subscription) {
      return { success: false, message: "No subscription found" }
    }

    // Check if subscription has expired
    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)

    if (now > periodEnd && subscription.status === "active" && !subscription.cancel_at_period_end) {
      // Subscription has expired, downgrade to free plan
      const { data: freePlan, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "Free")
        .single()

      if (planError || !freePlan) {
        return { success: false, message: "Free plan not found" }
      }

      // Calculate new period dates
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // Free plan is monthly

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: freePlan.id,
          status: "active",
          interval: "monthly",
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (updateError) {
        return { success: false, message: "Failed to update subscription" }
      }

      return {
        success: true,
        message: "Subscription expired and downgraded to free plan",
        wasExpired: true,
      }
    }

    return {
      success: true,
      message: "Subscription is active",
      expiresAt: subscription.current_period_end,
      wasExpired: false,
    }
  } catch (error) {
    console.error("Error in checkUserSubscriptionStatus:", error)
    return { success: false, message: (error as Error).message }
  }
}
