"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { checkPlanLimit } from "@/lib/subscription-limits"

/**
 * Get all expenses for the current user
 */
export async function getExpenses() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching expenses:", error)
      throw new Error("Failed to fetch expenses")
    }

    return data || []
  } catch (error) {
    console.error("Error in getExpenses:", error)
    throw error
  }
}

/**
 * Create a new expense
 */
export async function createExpense(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Get current expenses count
    const expenses = await getExpenses()

    // Check if user has reached their plan limit
    const limitCheck = await checkPlanLimit("expenses", expenses.length)

    if (!limitCheck.allowed) {
      return {
        error: limitCheck.message,
      }
    }

    const date = formData.get("date") as string
    const category = formData.get("category") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const description = formData.get("description") as string
    const receipt = formData.get("receipt") as string

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: session.user.id,
        date,
        category,
        amount,
        description,
        receipt_url: receipt,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating expense:", error)
      throw new Error("Failed to create expense")
    }

    revalidatePath("/dashboard/expenses")
    return { data }
  } catch (error) {
    console.error("Error in createExpense:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Get an expense by ID
 */
export async function getExpenseById(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching expense:", error)
      throw new Error("Failed to fetch expense")
    }

    return data
  } catch (error) {
    console.error("Error in getExpenseById:", error)
    throw error
  }
}

/**
 * Update an expense
 */
export async function updateExpense(id: string, formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const date = formData.get("date") as string
    const category = formData.get("category") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const description = formData.get("description") as string
    const receipt = formData.get("receipt") as string

    const { data, error } = await supabase
      .from("expenses")
      .update({
        date,
        category,
        amount,
        description,
        receipt_url: receipt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating expense:", error)
      throw new Error("Failed to update expense")
    }

    revalidatePath(`/dashboard/expenses/${id}`)
    revalidatePath("/dashboard/expenses")
    return { data }
  } catch (error) {
    console.error("Error in updateExpense:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting expense:", error)
      throw new Error("Failed to delete expense")
    }

    revalidatePath("/dashboard/expenses")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteExpense:", error)
    return { error: (error as Error).message }
  }
}
