import { createBrowserClient } from "@supabase/ssr"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"

export const createClient = () => {
  try {
    const url = supabaseEnv.url
    const anonKey = supabaseEnv.anonKey

    return createBrowserClient<Database>(url, anonKey)
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
}
