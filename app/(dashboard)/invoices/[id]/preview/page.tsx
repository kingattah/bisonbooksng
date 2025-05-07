import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { InvoicePreview } from "@/components/invoices/invoice-preview"

interface InvoicePreviewPageProps {
  params: {
    id: string
  }
}

export default async function InvoicePreviewPage({ params }: InvoicePreviewPageProps) {
  const supabase = createServerClient()

  // Fetch the invoice with client and business details
  const { data: invoice, error } = await supabase
    .from("invoices")
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
        logo_url
      )
    `)
    .eq("id", params.id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  // Fetch invoice items
  const { data: invoiceItems } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", params.id)
    .order("id")

  return (
    <DashboardShell>
      <DashboardHeader heading={`Invoice #${invoice.invoice_number}`} text="Preview, download or edit your invoice" />
      <InvoicePreview invoice={invoice} invoiceItems={invoiceItems || []} />
    </DashboardShell>
  )
}
