import type React from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { SafeBusinessSwitcher } from "@/components/dashboard/safe-business-switcher"
import { UserNav } from "@/components/dashboard/user-nav"
import { LoadingProvider } from "@/components/loading/loading-context"
import { LoadingScreen } from "@/components/loading/loading-screen"
import { SupabaseProvider } from "@/components/supabase-provider"
import { OfflineDetector } from "@/components/offline-detector"
import { OfflineSyncInitializer } from "@/components/offline-sync-initializer"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <SupabaseProvider>
      <LoadingProvider>
        <div className="flex min-h-screen flex-col bg-muted/10">
          <LoadingScreen />
          <OfflineSyncInitializer />
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <img src="/images/bisonbookslogo-removebg-preview.png" alt="Bison Books Logo" className="h-8 w-auto" />
                <span className="font-bold text-lg hidden sm:inline-block">Bison Books</span>
              </div>
              <div className="flex items-center gap-4">
                <SafeBusinessSwitcher />
                <UserNav user={session.user} />
              </div>
            </div>
          </header>
          <div className="container flex-1 items-start grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-6">
            <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
              <DashboardNav />
            </aside>
            <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
          </div>
          <OfflineDetector />
          <PWAInstallPrompt />
        </div>
      </LoadingProvider>
    </SupabaseProvider>
  )
}
