"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { checkPlanLimit } from "@/lib/subscription-limits"

/**
 * Get all receipts for the current user
 */
export async function getReceipts() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        clients (
          id,
          name,
          email
        ),
        invoices (
          id,
          invoice_number
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching receipts:", error)
      throw new Error("Failed to fetch receipts")
    }

    return data || []
  } catch (error) {
    console.error("Error in getReceipts:", error)
    throw error
  }
}

/**
 * Create a new receipt with strict limit enforcement
 */
export async function createReceipt(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Get current receipts count
    const { data: receiptsData, error: countError } = await supabase
      .from("receipts")
      .select("id")
      .eq("user_id", session.user.id)

    if (countError) {
      throw new Error("Failed to check receipt limits")
    }

    const receiptCount = receiptsData?.length || 0

    // Check if user has reached their plan limit
    const limitCheck = await checkPlanLimit("receipts", receiptCount)

    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.message,
      }
    }

    // Extract form data
    const businessId = formData.get("business_id") as string
    const clientId = formData.get("client_id") as string
    const invoiceId = formData.get("invoice_id") as string
    const receiptNumber = formData.get("receipt_number") as string
    const date = formData.get("date") as string
    const amount = formData.get("amount") as string
    const paymentMethod = formData.get("payment_method") as string
    const notes = formData.get("notes") as string

    // Convert "no-invoice" to null
    const finalInvoiceId = invoiceId === "no-invoice" ? null : invoiceId

    // Create the receipt
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        business_id: businessId,
        client_id: clientId,
        invoice_id: finalInvoiceId,
        receipt_number: receiptNumber,
        date,
        amount: Number.parseFloat(amount),
        payment_method: paymentMethod,
        notes,
        user_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Receipt creation error:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    // If there's an invoice, update its status to "paid"
    if (finalInvoiceId) {
      const { error: updateError } = await supabase.from("invoices").update({ status: "paid" }).eq("id", finalInvoiceId)

      if (updateError) {
        console.error("Invoice update error:", updateError)
      }
    }

    revalidatePath("/receipts")
    return { success: true, data }
  } catch (error: any) {
    console.error("Server error:", error)
    return { success: false, error: error.message || "Failed to create receipt" }
  }
}
