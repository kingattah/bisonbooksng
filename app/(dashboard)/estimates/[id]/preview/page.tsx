import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EstimatePreview } from "@/components/estimates/estimate-preview"

interface EstimatePreviewPageProps {
  params: {
    id: string
  }
}

export default async function EstimatePreviewPage({ params }: EstimatePreviewPageProps) {
  const supabase = createServerClient()

  // Fetch the estimate with client and business details
  const { data: estimate, error } = await supabase
    .from("estimates")
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

  return (
    <DashboardShell>
      <DashboardHeader
        heading={`Estimate #${estimate.estimate_number}`}
        text="Preview, download or edit your estimate"
      />
      <EstimatePreview estimate={estimate} estimateItems={estimateItems || []} />
    </DashboardShell>
  )
}
