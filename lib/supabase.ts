import { createBrowserClient } from "@supabase/ssr"
import { createServerClient as createServerClientSSR } from "@supabase/ssr"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { createAppCookieOperations, createPagesCookieOperations } from "./cookies-utils"

// For client components
export const createClient = () => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createBrowserClient<Database>(url, anonKey)
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
}

// For server components in app/ directory
export const createServerClient = () => {
  try {
    const url = supabaseEnv.url
    const anonKey = supabaseEnv.anonKey

    // Use dynamic import to avoid static import of next/headers
    const cookieOps = createAppCookieOperations()

    return createServerClientSSR<Database>(url, anonKey, {
      cookies: cookieOps,
    })
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    throw error
  }
}

// For pages directory
export const createServerClientForPages = (cookieStore: ReadonlyRequestCookies) => {
  try {
    const url = supabaseEnv.url
    const anonKey = supabaseEnv.anonKey

    const cookieOps = createPagesCookieOperations(cookieStore)

    return createServerClientSSR<Database>(url, anonKey, {
      cookies: cookieOps,
    })
  } catch (error) {
    console.error("Error creating Supabase server client for pages:", error)
    throw error
  }
}

// Create a browser-safe version for pages directory
export const createBrowserSafeClient = () => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createBrowserClient<Database>(url, anonKey)
  } catch (error) {
    console.error("Error creating browser-safe Supabase client:", error)
    throw error
  }
}
