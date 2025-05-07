import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ClientCreateButton } from "@/components/clients/client-create-button"
import { ClientsList } from "@/components/clients/clients-list"
import { SearchBar } from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage your clients",
}

export default async function ClientsPage() {
  const supabase = createServerClient()

  // Get all clients - the client component will filter them
  const { data: clients } = await supabase.from("clients").select("*").order("name", { ascending: true })

  return (
    <DashboardShell>
      <DashboardHeader heading="Clients" text="Manage your clients">
        <div className="flex items-center gap-4">
          <SearchBar placeholder="Search clients..." />
          <ClientCreateButton />
        </div>
      </DashboardHeader>
      <ClientsList clients={clients || []} />
    </DashboardShell>
  )
}
