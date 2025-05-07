import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ReportsDashboard } from "@/components/reports/reports-dashboard"

export const metadata: Metadata = {
  title: "Reports",
  description: "Financial reports and analytics for your business",
}

export default async function ReportsPage() {
  const supabase = createServerClient()

  // Get all businesses for the user
  const { data: businesses } = await supabase.from("businesses").select("id, name").order("name")

  return (
    <DashboardShell>
      <DashboardHeader heading="Reports" text="View financial reports and analytics for your business" />
      <ReportsDashboard businesses={businesses || []} />
    </DashboardShell>
  )
}
