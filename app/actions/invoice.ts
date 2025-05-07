"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { checkPlanLimit } from "@/lib/subscription-limits"

/**
 * Get all invoices for the current user
 */
export async function getInvoices() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients(*)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invoices:", error)
      throw new Error("Failed to fetch invoices")
    }

    return data || []
  } catch (error) {
    console.error("Error in getInvoices:", error)
    throw error
  }
}

/**
 * Get all invoices for the current user (not just current month)
 * This is used for checking plan limits
 */
export async function getAllUserInvoices() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase.from("invoices").select("*").eq("user_id", session.user.id)

    if (error) {
      console.error("Error fetching all user invoices:", error)
      throw new Error("Failed to fetch all user invoices")
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllUserInvoices:", error)
    throw error
  }
}

/**
 * Get invoices created in the current month
 */
export async function getCurrentMonthInvoices() {
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
      .from("invoices")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at", firstDay.toISOString())
      .lte("created_at", lastDay.toISOString())

    if (error) {
      console.error("Error fetching current month invoices:", error)
      throw new Error("Failed to fetch current month invoices")
    }

    return data || []
  } catch (error) {
    console.error("Error in getCurrentMonthInvoices:", error)
    throw error
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Get all user invoices count for limit checking
    const allUserInvoices = await getAllUserInvoices()

    // Check if user has reached their plan limit
    const limitCheck = await checkPlanLimit("invoices_per_month", allUserInvoices.length)

    if (!limitCheck.allowed) {
      return {
        error: limitCheck.message,
      }
    }

    const clientId = formData.get("clientId") as string
    const businessId = formData.get("businessId") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const issueDate = formData.get("issueDate") as string
    const dueDate = formData.get("dueDate") as string
    const status = formData.get("status") as string
    const notes = formData.get("notes") as string
    const subtotal = Number.parseFloat(formData.get("subtotal") as string)
    const taxRate = Number.parseFloat(formData.get("taxRate") as string)
    const taxAmount = Number.parseFloat(formData.get("taxAmount") as string)
    const total = Number.parseFloat(formData.get("total") as string)
    const items = JSON.parse(formData.get("items") as string)

    // Start a transaction
    const { data, error } = await supabase.rpc("create_invoice_with_items", {
      p_user_id: session.user.id,
      p_client_id: clientId,
      p_business_id: businessId,
      p_invoice_number: invoiceNumber,
      p_issue_date: issueDate,
      p_due_date: dueDate,
      p_status: status,
      p_notes: notes,
      p_subtotal: subtotal,
      p_tax_rate: taxRate,
      p_tax_amount: taxAmount,
      p_total: total,
      p_items: items,
    })

    if (error) {
      console.error("Error creating invoice:", error)
      throw new Error("Failed to create invoice")
    }

    revalidatePath("/dashboard/invoices")
    return { data }
  } catch (error) {
    console.error("Error in createInvoice:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Get an invoice by ID
 */
export async function getInvoiceById(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, client:clients(*), business:businesses(*)")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError)
      throw new Error("Failed to fetch invoice")
    }

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("id", { ascending: true })

    if (itemsError) {
      console.error("Error fetching invoice items:", itemsError)
      throw new Error("Failed to fetch invoice items")
    }

    return { ...invoice, items }
  } catch (error) {
    console.error("Error in getInvoiceById:", error)
    throw error
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(id: string, formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const clientId = formData.get("clientId") as string
    const businessId = formData.get("businessId") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const issueDate = formData.get("issueDate") as string
    const dueDate = formData.get("dueDate") as string
    const status = formData.get("status") as string
    const notes = formData.get("notes") as string
    const subtotal = Number.parseFloat(formData.get("subtotal") as string)
    const taxRate = Number.parseFloat(formData.get("taxRate") as string)
    const taxAmount = Number.parseFloat(formData.get("taxAmount") as string)
    const total = Number.parseFloat(formData.get("total") as string)
    const items = JSON.parse(formData.get("items") as string)

    // Start a transaction
    const { data, error } = await supabase.rpc("update_invoice_with_items", {
      p_invoice_id: id,
      p_user_id: session.user.id,
      p_client_id: clientId,
      p_business_id: businessId,
      p_invoice_number: invoiceNumber,
      p_issue_date: issueDate,
      p_due_date: dueDate,
      p_status: status,
      p_notes: notes,
      p_subtotal: subtotal,
      p_tax_rate: taxRate,
      p_tax_amount: taxAmount,
      p_total: total,
      p_items: items,
    })

    if (error) {
      console.error("Error updating invoice:", error)
      throw new Error("Failed to update invoice")
    }

    revalidatePath(`/dashboard/invoices/${id}`)
    revalidatePath("/dashboard/invoices")
    return { data }
  } catch (error) {
    console.error("Error in updateInvoice:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Delete invoice items first
    const { error: itemsError } = await supabase.from("invoice_items").delete().eq("invoice_id", id)

    if (itemsError) {
      console.error("Error deleting invoice items:", itemsError)
      throw new Error("Failed to delete invoice items")
    }

    // Then delete the invoice
    const { error: invoiceError } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", session.user.id)

    if (invoiceError) {
      console.error("Error deleting invoice:", invoiceError)
      throw new Error("Failed to delete invoice")
    }

    revalidatePath("/dashboard/invoices")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteInvoice:", error)
    return { error: (error as Error).message }
  }
}
