"use client"

import { useEffect, useState } from "react"
import { useLoading } from "./loading-context"
import { Progress } from "@/components/ui/progress"

export function LoadingScreen() {
  const { isLoading, loadingMessage, operation } = useLoading()
  const [progress, setProgress] = useState(0)
  const [timeEstimate, setTimeEstimate] = useState("")

  // Simulate progress based on operation type
  useEffect(() => {
    if (!isLoading) {
      setProgress(0)
      return
    }

    // Different operations have different expected durations
    const totalDuration =
      operation === "business-switch"
        ? 3000
        : operation === "data-fetch"
          ? 2000
          : operation === "report-generation"
            ? 5000
            : 2500 // default

    // Reset progress when loading starts
    setProgress(0)

    // Start progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down progress as it approaches 90%
        if (prev < 90) {
          const increment = 90 - prev > 30 ? 5 : 1
          return Math.min(prev + increment, 90)
        }
        return prev
      })
    }, 100)

    // Update time estimate
    const estimateInterval = setInterval(() => {
      const remaining = Math.max(0, totalDuration - (progress / 100) * totalDuration)
      const seconds = Math.ceil(remaining / 1000)
      setTimeEstimate(seconds > 0 ? `Estimated time: ${seconds} seconds` : "Almost done...")
    }, 500)

    return () => {
      clearInterval(interval)
      clearInterval(estimateInterval)
    }
  }, [isLoading, operation, progress])

  // Complete progress when loading is done
  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100)
      const timeout = setTimeout(() => {
        setProgress(0)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [isLoading, progress])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center gap-6 max-w-md w-full px-4">
        <div className="relative w-32 h-32">
          {/* Outer circle */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />

            {/* Progress arc - animated based on actual progress */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progress) / 100}
              transform="rotate(-90 50 50)"
            />

            {/* Bison Books logo in the center */}
            <image href="/images/bisonbookslogo-removebg-preview.png" x="25" y="25" height="50" width="50" />
          </svg>

          {/* Percentage in the middle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          <h3 className="text-xl font-semibold text-center text-primary">{loadingMessage || "Loading..."}</h3>

          <Progress value={progress} className="h-2 w-full" />

          <p className="text-sm text-center text-muted-foreground">{timeEstimate}</p>

          <p className="text-xs text-center text-muted-foreground mt-2">{getOperationMessage(operation)}</p>
        </div>
      </div>
    </div>
  )
}

function getOperationMessage(operation?: string): string {
  switch (operation) {
    case "business-switch":
      return "Switching business context and loading data..."
    case "data-fetch":
      return "Retrieving your latest financial data..."
    case "report-generation":
      return "Generating financial reports and analytics..."
    case "invoice-creation":
      return "Creating and processing your invoice..."
    default:
      return "Loading your data..."
  }
}
