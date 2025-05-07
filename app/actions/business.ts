"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { checkPlanLimit } from "@/lib/subscription-limits"

/**
 * Get all businesses for the current user
 */
export async function getBusinesses() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching businesses:", error)
      throw new Error("Failed to fetch businesses")
    }

    return data || []
  } catch (error) {
    console.error("Error in getBusinesses:", error)
    throw error
  }
}

/**
 * Create a new business
 */
export async function createBusiness(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Get current businesses count
    const businesses = await getBusinesses()
    console.log("Current businesses count:", businesses.length)

    // Check if user has reached their plan limit
    const limitCheck = await checkPlanLimit("businesses", businesses.length)
    console.log("Limit check result:", limitCheck)

    // CRITICAL: Enforce the limit - if not allowed, return an error and don't proceed
    if (!limitCheck.allowed) {
      console.log("Plan limit reached, rejecting business creation")
      return {
        success: false,
        error: limitCheck.message,
      }
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        user_id: session.user.id,
        name,
        email,
        phone,
        address,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating business:", error)
      throw new Error("Failed to create business")
    }

    revalidatePath("/dashboard/businesses")
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("Error in createBusiness:", error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Get a business by ID
 */
export async function getBusinessById(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching business:", error)
      throw new Error("Failed to fetch business")
    }

    return data
  } catch (error) {
    console.error("Error in getBusinessById:", error)
    throw error
  }
}

/**
 * Update a business
 */
export async function updateBusiness(id: string, formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string

    const { data, error } = await supabase
      .from("businesses")
      .update({
        name,
        email,
        phone,
        address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating business:", error)
      throw new Error("Failed to update business")
    }

    revalidatePath(`/dashboard/businesses/${id}`)
    revalidatePath("/dashboard/businesses")
    return { data }
  } catch (error) {
    console.error("Error in updateBusiness:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Delete a business
 */
export async function deleteBusiness(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { error } = await supabase.from("businesses").delete().eq("id", id).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting business:", error)
      throw new Error("Failed to delete business")
    }

    revalidatePath("/dashboard/businesses")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteBusiness:", error)
    return { error: (error as Error).message }
  }
}
