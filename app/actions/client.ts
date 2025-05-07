"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { checkPlanLimit } from "@/lib/subscription-limits"

/**
 * Get all clients for the current user
 */
export async function getClients() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return []
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clients:", error)
      throw new Error("Failed to fetch clients")
    }

    return data || []
  } catch (error) {
    console.error("Error in getClients:", error)
    throw error
  }
}

/**
 * Create a new client
 */
export async function createClient(formData: FormData) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    // Get current clients count
    const clients = await getClients()

    // Check if user has reached their plan limit
    const limitCheck = await checkPlanLimit("clients", clients.length)

    if (!limitCheck.allowed) {
      return {
        error: limitCheck.message,
      }
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const postalCode = formData.get("postalCode") as string
    const country = formData.get("country") as string
    const notes = formData.get("notes") as string

    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: session.user.id,
        name,
        email,
        phone,
        address,
        city,
        state,
        postal_code: postalCode,
        country,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating client:", error)
      throw new Error("Failed to create client")
    }

    revalidatePath("/dashboard/clients")
    return { data }
  } catch (error) {
    console.error("Error in createClient:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Get a client by ID
 */
export async function getClientById(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching client:", error)
      throw new Error("Failed to fetch client")
    }

    return data
  } catch (error) {
    console.error("Error in getClientById:", error)
    throw error
  }
}

/**
 * Update a client
 */
export async function updateClient(id: string, formData: FormData) {
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
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const postalCode = formData.get("postalCode") as string
    const country = formData.get("country") as string
    const notes = formData.get("notes") as string

    const { data, error } = await supabase
      .from("clients")
      .update({
        name,
        email,
        phone,
        address,
        city,
        state,
        postal_code: postalCode,
        country,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating client:", error)
      throw new Error("Failed to update client")
    }

    revalidatePath(`/dashboard/clients/${id}`)
    revalidatePath("/dashboard/clients")
    return { data }
  } catch (error) {
    console.error("Error in updateClient:", error)
    return { error: (error as Error).message }
  }
}

/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("Not authenticated")
    }

    const { error } = await supabase.from("clients").delete().eq("id", id).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting client:", error)
      throw new Error("Failed to delete client")
    }

    revalidatePath("/dashboard/clients")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteClient:", error)
    return { error: (error as Error).message }
  }
}
