import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { BusinessCreateButton } from "@/components/businesses/business-create-button"
import { BusinessesList } from "@/components/businesses/businesses-list"

export const metadata: Metadata = {
  title: "Businesses",
  description: "Manage your businesses",
}

export default async function BusinessesPage() {
  const supabase = createServerClient()
  const { data: businesses } = await supabase.from("businesses").select("*")

  return (
    <DashboardShell>
      <DashboardHeader heading="Businesses" text="Manage your businesses">
        <BusinessCreateButton />
      </DashboardHeader>
      <BusinessesList businesses={businesses || []} />
    </DashboardShell>
  )
}
