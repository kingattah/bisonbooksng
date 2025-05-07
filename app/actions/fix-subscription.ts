"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

/**
 * Fix a subscription that is stuck in pending status
 */
export async function fixPendingSubscription() {
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
      .select("*")
      .eq("user_id", session.user.id)
      .eq("status", "pending")
      .single()

    if (error) {
      console.error("Error fetching subscription:", error)
      return { success: false, message: "No pending subscription found" }
    }

    if (!subscription) {
      return { success: false, message: "No pending subscription found" }
    }

    // Check if there's a paid invoice for this subscription
    const { data: invoice, error: invoiceError } = await supabase
      .from("subscription_invoices")
      .select("*")
      .eq("subscription_id", subscription.id)
      .eq("status", "paid")
      .single()

    // If there's a paid invoice, update the subscription to active
    if (invoice && !invoiceError) {
      // Calculate period end date based on interval
      const startDate = new Date()
      const endDate = new Date(startDate)

      if (subscription.interval === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      // Update the subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (updateError) {
        console.error("Error updating subscription:", updateError)
        return { success: false, message: "Failed to update subscription" }
      }

      revalidatePath("/billing")
      return { success: true, message: "Subscription activated successfully" }
    }

    // If there's no paid invoice, check if there's a payment reference
    if (subscription.paystack_authorization_code) {
      // Update the subscription to active
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (updateError) {
        console.error("Error updating subscription:", updateError)
        return { success: false, message: "Failed to update subscription" }
      }

      revalidatePath("/billing")
      return { success: true, message: "Subscription activated successfully" }
    }

    return { success: false, message: "No payment found for this subscription" }
  } catch (error) {
    console.error("Error in fixPendingSubscription:", error)
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Check if a subscription has a valid payment but is still pending
 */
export async function checkSubscriptionPaymentStatus() {
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
      .select("*, subscription_plans(*), subscription_invoices(*)")
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching subscription:", error)
      return { success: false, message: "No subscription found" }
    }

    if (!subscription) {
      return { success: false, message: "No subscription found" }
    }

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.subscription_plans?.name,
        interval: subscription.interval,
        currentPeriodEnd: subscription.current_period_end,
        hasPayment: subscription.paystack_authorization_code ? true : false,
        invoices: subscription.subscription_invoices?.length || 0,
      },
    }
  } catch (error) {
    console.error("Error in checkSubscriptionPaymentStatus:", error)
    return { success: false, message: (error as Error).message }
  }
}
