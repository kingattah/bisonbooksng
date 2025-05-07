"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

export function PaystackEnvironmentIndicator() {
  const [environment, setEnvironment] = useState<string>("")

  useEffect(() => {
    // We need to check this on the client side since we're using NEXT_PUBLIC_ env vars
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ""
    const isLive = publicKey.startsWith("pk_live_")
    setEnvironment(isLive ? "Production" : "Test")
  }, [])

  if (!environment) return null

  return (
    <Badge variant={environment === "Production" ? "default" : "outline"} className="ml-2">
      {environment === "Production" ? "🔴 Live" : "🟢 Test"}
    </Badge>
  )
}
