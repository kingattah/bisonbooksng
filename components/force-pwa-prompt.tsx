"use client"

import { useEffect } from "react"
import { PWAInstallPrompt } from "./pwa-install-prompt"

export function ForcePWAPrompt() {
  useEffect(() => {
    // Remove any previous dismissal record
    localStorage.removeItem("pwa-install-dismissed")
  }, [])

  return <PWAInstallPrompt />
}
