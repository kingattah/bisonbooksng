import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SettingsForm } from "@/components/settings/settings-form"

export const metadata: Metadata = {
  title: "Change Password",
  description: "Update your password to keep your account secure",
}

export default async function SettingsPage() {
  const supabase = createServerClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardShell>
      <DashboardHeader heading="Security Settings" text="Update your password to keep your account secure" />
      <div className="grid gap-10">
        <SettingsForm user={user} profile={null} />
      </div>
    </DashboardShell>
  )
}
