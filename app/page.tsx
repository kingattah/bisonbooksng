import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { LandingPage } from "@/components/landing-page"

// Add this to explicitly mark the page as dynamic
export const dynamic = "force-dynamic"

export default async function Home() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
