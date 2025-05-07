"use client"

import { useEffect } from "react"
import { offlineSync } from "@/lib/offline-sync"

export function OfflineSyncInitializer() {
  useEffect(() => {
    offlineSync.init()
  }, [])

  return null
}
