"use client"

import { useEffect, useState } from "react"
import { BusinessSwitcher } from "@/components/dashboard/business-switcher"
import { Button } from "@/components/ui/button"

export function SafeBusinessSwitcher() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration error
  if (!isMounted) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        Loading...
      </Button>
    )
  }

  return <BusinessSwitcher />
}
