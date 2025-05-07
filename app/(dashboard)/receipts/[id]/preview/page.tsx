import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ReceiptPreview } from "@/components/receipts/receipt-preview"

interface ReceiptPreviewPageProps {
  params: {
    id: string
  }
}

export default async function ReceiptPreviewPage({ params }: ReceiptPreviewPageProps) {
  const supabase = createServerClient()

  // Fetch the receipt with client and business details
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select(`
      *,
      clients (
        id,
        name,
        email,
        phone,
        address
      ),
      businesses (
        id,
        name,
        email,
        phone,
        address,
        logo_url,
        logo_base64
      ),
      invoices (
        id,
        invoice_number
      )
    `)
    .eq("id", params.id)
    .single()

  if (error || !receipt) {
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={`Receipt #${receipt.receipt_number}`} text="Preview, download or print your receipt" />
      <ReceiptPreview receipt={receipt} />
    </DashboardShell>
  )
}
