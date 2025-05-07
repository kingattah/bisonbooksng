import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form"

interface InvoicePageProps {
  params: {
    id: string
  }
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const supabase = createServerClient()

  // Fetch the invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      clients (
        id,
        name,
        email
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

  // Fetch all clients for the business
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("business_id", invoice.business_id)
    .order("name")

  return (
    <DashboardShell>
      <DashboardHeader heading={`Edit Invoice #${invoice.invoice_number}`} text="Update invoice details" />
      <InvoiceEditForm invoice={invoice} invoiceItems={invoiceItems || []} clients={clients || []} />
    </DashboardShell>
  )
}
