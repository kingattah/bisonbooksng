import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { BusinessSelector } from "@/components/dashboard/business-selector"
import { DashboardCards } from "@/components/dashboard/dashboard-cards"
import { RecentInvoices } from "@/components/dashboard/recent-invoices"
import { RecentExpenses } from "@/components/dashboard/recent-expenses"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business finances",
}

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: businesses } = await supabase.from("businesses").select("*")

  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Overview of your business finances">
        <BusinessSelector />
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCards />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <RecentInvoices className="col-span-4" />
        <RecentExpenses className="col-span-3" />
      </div>
    </DashboardShell>
  )
}
