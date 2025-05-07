"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

/**
 * Get all estimates for the current user
 */
export async function getEstimates() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("estimates")
      .select(`
        *,
        clients (
          id,
          name,
          email
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching estimates:", error)
      throw new Error("Failed to fetch estimates")
    }

    return data || []
  } catch (error) {
    console.error("Error in getEstimates:", error)
    throw error
  }
}

/**
 * Get estimates created in the current month
 */
export async function getCurrentMonthEstimates() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    // Get the first and last day of the current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data, error } = await supabase
      .from("estimates")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at", firstDay.toISOString())
      .lte("created_at", lastDay.toISOString())

    if (error) {
      console.error("Error fetching current month estimates:", error)
      throw new Error("Failed to fetch current month estimates")
    }

    return data || []
  } catch (error) {
    console.error("Error in getCurrentMonthEstimates:", error)
    throw error
  }
}

/**
 * Create a new estimate
 */
export async function createEstimate(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const businessId = formData.get("businessId") as string
    const clientId = formData.get("clientId") as string
    const estimateNumber = formData.get("estimateNumber") as string
    const issueDate = formData.get("issueDate") as string
    const expiryDate = formData.get("expiryDate") as string
    const status = formData.get("status") as string
    const notes = formData.get("notes") as string
    const subtotal = Number.parseFloat(formData.get("subtotal") as string)
    const taxRate = Number.parseFloat(formData.get("taxRate") as string)
    const taxAmount = Number.parseFloat(formData.get("taxAmount") as string)
    const total = Number.parseFloat(formData.get("total") as string)
    const items = JSON.parse(formData.get("items") as string)

    // Start a transaction
    const { data, error } = await supabase.rpc("create_estimate_with_items", {
      p_user_id: session.user.id,
      p_client_id: clientId,
      p_business_id: businessId,
      p_estimate_number: estimateNumber,
      p_issue_date: issueDate,
      p_expiry_date: expiryDate,
      p_status: status,
      p_notes: notes,
      p_subtotal: subtotal,
      p_tax_rate: taxRate,
      p_tax_amount: taxAmount,
      p_total: total,
      p_items: items,
    })

    if (error) {
      console.error("Error creating estimate:", error)
      return { error: error.message }
    }

    revalidatePath("/estimates")
    return { data }
  } catch (error) {
    console.error("Error in createEstimate:", error)
    return { error: (error as Error).message }
  }
}
