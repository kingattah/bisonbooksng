import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ReceiptCreateButton } from "@/components/receipts/receipt-create-button"
import { ReceiptsList } from "@/components/receipts/receipts-list"
import { SearchBar } from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Receipts",
  description: "Manage payment receipts for your clients",
}

export default async function ReceiptsPage() {
  const supabase = createServerClient()

  // Try to get the selected business ID from cookies
  const cookieStore = cookies()
  const selectedBusinessIdCookie = cookieStore.get("selectedBusinessId")

  // Get the first business if no business is selected
  let businessId = selectedBusinessIdCookie?.value

  if (!businessId) {
    const { data: firstBusiness } = await supabase.from("businesses").select("id").limit(1).single()
    businessId = firstBusiness?.id
  }

  // Fetch receipts for the selected business
  const { data: receipts } = await supabase
    .from("receipts")
    .select(`
      *,
      clients (
        id,
        name,
        email
      ),
      invoices (
        id,
        invoice_number
      )
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })

  return (
    <DashboardShell>
      <DashboardHeader heading="Receipts" text="Manage payment receipts for your clients">
        <div className="flex items-center gap-4">
          <SearchBar placeholder="Search receipts..." />
          <ReceiptCreateButton />
        </div>
      </DashboardHeader>
      <ReceiptsList receipts={receipts || []} />
    </DashboardShell>
  )
}
