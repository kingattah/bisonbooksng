import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BusinessLogoManager } from "@/components/business/business-logo-manager"

export const metadata = {
  title: "Business Logo Management",
  description: "Upload and manage logos for your businesses",
}

export default function BusinessLogoPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <DashboardHeader heading="Business Logo Management" text="Upload and manage logos for your businesses" />
      <div className="grid gap-4">
        <BusinessLogoManager />
      </div>
    </div>
  )
}
