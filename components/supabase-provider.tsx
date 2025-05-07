"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create context with default undefined value to detect improper usage
const SupabaseContext = createContext<
  | {
      session: Session | null
      supabase: SupabaseClient<Database> | null
    }
  | undefined
>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        // Initialize Supabase client
        const supabaseInstance = createClient()
        setSupabase(supabaseInstance)

        // Get initial session
        try {
          const { data } = await supabaseInstance.auth.getSession()
          setSession(data.session)
        } catch (sessionError) {
          console.error("Error getting session:", sessionError)
          setError("Failed to get authentication session. Please try refreshing the page.")

          // Clear any invalid session data
          try {
            await supabaseInstance.auth.signOut({ scope: "local" })
          } catch (signOutError) {
            console.error("Error signing out after session error:", signOutError)
          }
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabaseInstance.auth.onAuthStateChange((_event, session) => {
          setSession(session)
        })

        // Cleanup
        return () => {
          subscription.unsubscribe()
        }
      } catch (initError: any) {
        console.error("Error initializing Supabase client:", initError)
        setError(
          initError instanceof Error
            ? initError.message
            : "Failed to initialize Supabase client. Please check your environment variables.",
        )
        return () => {}
      } finally {
        setIsLoading(false)
      }
    }

    initializeSupabase()
  }, [])

  // Show a simple loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading application...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="mb-6 text-gray-700">{error}</p>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800">
            <h3 className="font-semibold mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-left">
              <li>
                Check that you have a <code className="bg-amber-100 px-1 rounded">.env.local</code> file in your project
                root
              </li>
              <li>
                Ensure it contains the following variables:
                <pre className="bg-amber-100 p-2 rounded mt-2 overflow-x-auto">
                  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url{"\n"}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
                </pre>
              </li>
              <li>Restart your development server</li>
              <li>If deploying, check your environment variables in your hosting platform</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // If supabase is null, show an error
  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Initialization Error</h2>
          <p className="mb-6 text-gray-700">Supabase client could not be initialized</p>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800">
            <p>Please refresh the page or check your browser console for more details.</p>
          </div>
        </div>
      </div>
    )
  }

  return <SupabaseContext.Provider value={{ session, supabase }}>{children}</SupabaseContext.Provider>
}

// Hook to use the session
export function useSession() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SupabaseProvider")
  }
  return context.session
}

// Hook to use the Supabase client
export function useSupabaseClient(): SupabaseClient<Database> {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabaseClient must be used within a SupabaseProvider")
  }
  if (!context.supabase) {
    throw new Error("Supabase client not initialized")
  }
  return context.supabase
}
