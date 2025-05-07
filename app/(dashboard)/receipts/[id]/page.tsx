import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ReceiptEditForm } from "@/components/receipts/receipt-edit-form"

interface ReceiptPageProps {
  params: {
    id: string
  }
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const supabase = createServerClient()

  // Fetch the receipt
  const { data: receipt, error } = await supabase
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
    .eq("id", params.id)
    .single()

  if (error || !receipt) {
    notFound()
  }

  // Fetch all clients for the business
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("business_id", receipt.business_id)
    .order("name")

  // Fetch invoices for the selected client
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, status")
    .eq("business_id", receipt.business_id)
    .eq("client_id", receipt.client_id)
    .order("created_at", { ascending: false })

  return (
    <DashboardShell>
      <DashboardHeader heading={`Edit Receipt #${receipt.receipt_number}`} text="Update receipt details" />
      <ReceiptEditForm receipt={receipt} clients={clients || []} invoices={invoices || []} />
    </DashboardShell>
  )
}
