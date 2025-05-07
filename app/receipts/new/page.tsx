import { createClient } from "@/lib/supabase/server"
import { ReceiptForm } from "@/components/receipts/receipt-form"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Add this to explicitly mark the page as dynamic
export const dynamic = "force-dynamic"

export default async function NewReceiptPage() {
  const cookieStore = cookies()
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // Get the selected business ID from cookies
  const selectedBusinessId = cookieStore.get("selectedBusiness")?.value

  if (!selectedBusinessId) {
    return redirect("/businesses")
  }

  // Fetch clients for the selected business
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("business_id", selectedBusinessId)
    .order("name")

  // Fetch all invoices for the selected business that are in "sent" status
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, status, client_id, due_date")
    .eq("business_id", selectedBusinessId)
    .eq("status", "sent") // Only unpaid invoices
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Create Receipt</h1>

      <ReceiptForm clients={clients || []} invoices={invoices || []} businessId={selectedBusinessId} />
    </div>
  )
}
