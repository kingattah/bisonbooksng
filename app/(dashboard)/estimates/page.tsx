import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EstimateCreateButton } from "@/components/estimates/estimate-create-button"
import { EstimatesList } from "@/components/estimates/estimates-list"
import { SearchBar } from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Estimates",
  description: "Create and manage estimates for your clients",
}

export default async function EstimatesPage() {
  const supabase = createServerClient()

  // Try to get the selected business ID from cookies
  const cookieStore = await cookies()
  const selectedBusinessIdCookie = cookieStore.get("selectedBusinessId")

  // Get the first business if no business is selected
  let businessId = selectedBusinessIdCookie?.value

  if (!businessId) {
    const { data: firstBusiness } = await supabase.from("businesses").select("id").limit(1).single()
    businessId = firstBusiness?.id
  }

  // Fetch estimates for the selected business
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select(`
      *,
      clients (
        id,
        name,
        email
      )
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching estimates:", error)
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Estimates" text="Create and manage estimates for your clients">
        <div className="flex items-center gap-4">
          <SearchBar placeholder="Search estimates..." />
          <EstimateCreateButton />
        </div>
      </DashboardHeader>
      <EstimatesList estimates={estimates || []} />
    </DashboardShell>
  )
}
