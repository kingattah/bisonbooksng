import type React from "react"
interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return <div className="flex min-h-screen flex-col space-y-8 p-6 bg-background">{children}</div>
}
