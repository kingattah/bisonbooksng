import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EstimateEditForm } from "@/components/estimates/estimate-edit-form"

interface EstimatePageProps {
  params: {
    id: string
  }
}

export default async function EstimatePage({ params }: EstimatePageProps) {
  const supabase = createServerClient()

  // Fetch the estimate
  const { data: estimate, error } = await supabase
    .from("estimates")
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

  if (error || !estimate) {
    notFound()
  }

  // Fetch estimate items
  const { data: estimateItems } = await supabase
    .from("estimate_items")
    .select("*")
    .eq("estimate_id", params.id)
    .order("id")

  // Fetch all clients for the business
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("business_id", estimate.business_id)
    .order("name")

  return (
    <DashboardShell>
      <DashboardHeader heading={`Edit Estimate #${estimate.estimate_number}`} text="Update estimate details" />
      <EstimateEditForm estimate={estimate} estimateItems={estimateItems || []} clients={clients || []} />
    </DashboardShell>
  )
}
