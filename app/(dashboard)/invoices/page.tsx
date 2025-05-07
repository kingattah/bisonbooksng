import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { InvoiceCreateButton } from "@/components/invoices/invoice-create-button"
import { InvoicesList } from "@/components/invoices/invoices-list"
import { SearchBar } from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage your invoices",
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createServerClient()

  // Try to get the selected business ID from cookies
  const cookieStore = await cookies()
  const selectedBusinessIdCookie = cookieStore.get("selectedBusinessId")?.value

  // Get the first business if no business is selected
  let businessId = selectedBusinessIdCookie

  if (!businessId) {
    const { data: firstBusiness } = await supabase.from("businesses").select("id").limit(1).single()
    businessId = firstBusiness?.id
  }

  // Build the query for invoices
  let query = supabase
    .from("invoices")
    .select(`
      *,
      clients (
        id,
        name,
        email
      )
    `)
    .eq("business_id", businessId)

  // Add search filter if search query exists
  if (searchParams.q) {
    const searchTerm = `%${searchParams.q}%`
    query = query.or(`invoice_number.ilike.${searchTerm},clients.name.ilike.${searchTerm}`)
  }

  // Order by creation date
  query = query.order("created_at", { ascending: false })

  const { data: invoices } = await query

  return (
    <DashboardShell>
      <DashboardHeader heading="Invoices" text="Create and manage invoices">
        <InvoiceCreateButton />
      </DashboardHeader>
      <div className="mb-4">
        <SearchBar placeholder="Search invoices..." />
      </div>
      <InvoicesList invoices={invoices || []} />
    </DashboardShell>
  )
}
