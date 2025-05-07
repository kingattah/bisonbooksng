import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"

export const createClient = () => {
  try {
    const url = supabaseEnv.url
    const anonKey = supabaseEnv.anonKey
    const cookieStore = cookies()

    return createServerClient<Database>(url, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            console.error(`Error setting cookie ${name}:`, error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name, options)
          } catch (error) {
            console.error(`Error removing cookie ${name}:`, error)
          }
        },
      },
    })
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    throw error
  }
}
