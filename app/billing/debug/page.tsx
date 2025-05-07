"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fixPendingSubscription, checkSubscriptionPaymentStatus } from "@/app/actions/fix-subscription"
import { refreshSubscriptionData } from "@/app/actions/subscription"
import { Loader2 } from "lucide-react"

export default function SubscriptionDebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState("")

  const handleCheckStatus = async () => {
    setLoading(true)
    setMessage("Checking subscription status...")
    try {
      const response = await checkSubscriptionPaymentStatus()
      setResult(response)
      setMessage(response.success ? "Status check complete" : response.message)
    } catch (error) {
      setResult({ success: false, error: (error as Error).message })
      setMessage("Error checking status")
    } finally {
      setLoading(false)
    }
  }

  const handleFixSubscription = async () => {
    setLoading(true)
    setMessage("Fixing subscription...")
    try {
      const response = await fixPendingSubscription()
      setResult(response)
      setMessage(response.success ? "Subscription fixed successfully" : response.message)
    } catch (error) {
      setResult({ success: false, error: (error as Error).message })
      setMessage("Error fixing subscription")
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshData = async () => {
    setLoading(true)
    setMessage("Refreshing subscription data...")
    try {
      const response = await refreshSubscriptionData()
      setResult(response)
      setMessage(response.success ? "Data refreshed successfully" : response.message)
    } catch (error) {
      setResult({ success: false, error: (error as Error).message })
      setMessage("Error refreshing data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Subscription Debug Tools</CardTitle>
          <CardDescription>Use these tools to diagnose and fix issues with your subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button onClick={handleCheckStatus} disabled={loading}>
              Check Subscription Status
            </Button>
            <Button onClick={handleFixSubscription} disabled={loading}>
              Fix Pending Subscription
            </Button>
            <Button onClick={handleRefreshData} disabled={loading}>
              Refresh Subscription Data
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{message}</p>
            </div>
          )}

          {result && !loading && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm overflow-auto p-2 bg-gray-100 rounded">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/billing")}>
            Go to Billing
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
