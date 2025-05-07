"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type LoadingOperation = "business-switch" | "data-fetch" | "report-generation" | "invoice-creation" | "general"

interface LoadingContextType {
  isLoading: boolean
  loadingMessage: string
  operation?: LoadingOperation
  setLoading: (loading: boolean, message?: string, operation?: LoadingOperation) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading...")
  const [operation, setOperation] = useState<LoadingOperation | undefined>(undefined)

  const setLoading = (loading: boolean, message?: string, op?: LoadingOperation) => {
    setIsLoading(loading)
    if (message) setLoadingMessage(message)
    setOperation(op)
  }

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        operation,
        setLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}
