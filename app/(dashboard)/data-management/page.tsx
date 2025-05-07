import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DataDashboard } from "@/components/dashboard/data-dashboard"

export default function DataManagementPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Data Management"
        text="Create and manage your businesses, clients, invoices, and expenses"
      />
      <DataDashboard />
    </DashboardShell>
  )
}
