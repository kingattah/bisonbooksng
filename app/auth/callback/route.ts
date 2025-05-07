import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createClient()

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code)

    // Redirect to the dashboard
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL("/login", requestUrl.origin))
}
