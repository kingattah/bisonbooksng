import { createClient } from "@/lib/supabase/server"
import { ReceiptEditForm } from "@/components/receipts/receipt-edit-form"
import { notFound, redirect } from "next/navigation"

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditReceiptPage({ params }: PageProps) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // Fetch the receipt with client and invoice details
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select(`
      *,
      clients:client_id (id, name, email),
      invoices:invoice_id (id, invoice_number)
    `)
    .eq("id", params.id)
    .single()

  if (error || !receipt) {
    console.error("Error fetching receipt:", error)
    return notFound()
  }

  // Fetch all clients for the business
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("business_id", receipt.business_id)
    .order("name")

  // Fetch all invoices for the business
  // Include both "sent" invoices and the current invoice if it exists
  const { data: sentInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, status, client_id, due_date")
    .eq("business_id", receipt.business_id)
    .eq("status", "sent")
    .order("created_at", { ascending: false })

  // If the receipt has an invoice that's already paid, fetch it separately
  let currentInvoice = null
  if (receipt.invoice_id) {
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status, client_id, due_date")
      .eq("id", receipt.invoice_id)
      .single()

    if (data) {
      currentInvoice = data
    }
  }

  // Combine sent invoices with current invoice if it exists and isn't already in the list
  let invoices = sentInvoices || []
  if (currentInvoice && !invoices.some((inv) => inv.id === currentInvoice.id)) {
    invoices = [...invoices, currentInvoice]
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Receipt</h1>

      <ReceiptEditForm receipt={receipt} clients={clients || []} invoices={invoices || []} />
    </div>
  )
}
