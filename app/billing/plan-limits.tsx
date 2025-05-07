"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getUserSubscription } from "@/app/actions/subscription"
import { getClients } from "@/app/actions/client"
import { getBusinesses } from "@/app/actions/business"
import { getExpenses } from "@/app/actions/expense"
import { getCurrentMonthInvoices } from "@/app/actions/invoice"
import { getReceipts } from "@/app/actions/receipt"
import type { PlanFeatures } from "@/lib/subscription-limits"
import { DEFAULT_FREE_PLAN_LIMITS } from "@/lib/subscription-limits"
import { getEstimates } from "@/app/actions/estimate"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function PlanLimits() {
  const [subscription, setSubscription] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [businesses, setBusinesses] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const loadData = async () => {
    try {
      setLoading('loading')
    setError(null)

      // Fetch subscription data
      const subscriptionData = await getUserSubscription()
      setSubscription(subscriptionData)

      // Only fetch usage data if user has a paid plan
      if (subscriptionData?.subscription_plans?.name === 'Basic') {
        const [
          clientsData,
          businessesData,
          expensesData,
          invoicesData,
          receiptsData,
          estimatesData
        ] = await Promise.all([
          getClients(),
          getBusinesses(),
          getExpenses(),
          getCurrentMonthInvoices(),
          getReceipts(),
          getEstimates()
        ])

        setClients(clientsData)
        setBusinesses(businessesData)
        setExpenses(expensesData)
        setInvoices(invoicesData)
        setReceipts(receiptsData)
        setEstimates(estimatesData)
      }
    } catch (err) {
      console.error("Error loading usage data:", err)
      setError("Failed to load usage data. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>Loading your current usage...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>There was an error loading your usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadData} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Use free plan limits if no subscription or not Basic plan
  const planFeatures = subscription?.subscription_plans?.name === 'Basic' 
    ? subscription.subscription_plans.features as PlanFeatures
    : DEFAULT_FREE_PLAN_LIMITS

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Your {subscription?.subscription_plans?.name === 'Basic' ? 'Basic' : 'Free'} Plan Limits
        </CardTitle>
        <CardDescription>
          {subscription?.subscription_plans?.name === 'Basic' 
            ? "Current usage for your Basic plan" 
            : "Current usage for your Free plan"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Businesses Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Businesses</span>
            <span className="text-sm font-medium">
              {businesses.length} / {planFeatures?.businesses === "Unlimited" ? "∞" : planFeatures?.businesses}
            </span>
          </div>
          {planFeatures?.businesses !== "Unlimited" && (
            <Progress
              value={(businesses.length / (planFeatures?.businesses as number)) * 100}
              className="h-2"
              color={businesses.length >= (planFeatures?.businesses as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>

        {/* Clients Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Clients</span>
            <span className="text-sm font-medium">
              {clients.length} / {planFeatures?.clients === "Unlimited" ? "∞" : planFeatures?.clients}
            </span>
          </div>
          {planFeatures?.clients !== "Unlimited" && (
            <Progress
              value={(clients.length / (planFeatures?.clients as number)) * 100}
              className="h-2"
              color={clients.length >= (planFeatures?.clients as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>

        {/* Expenses Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Expenses</span>
            <span className="text-sm font-medium">
              {expenses.length} / {planFeatures?.expenses === "Unlimited" ? "∞" : planFeatures?.expenses}
            </span>
          </div>
          {planFeatures?.expenses !== "Unlimited" && (
            <Progress
              value={(expenses.length / (planFeatures?.expenses as number)) * 100}
              className="h-2"
              color={expenses.length >= (planFeatures?.expenses as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>

        {/* Invoices per Month Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Invoices This Month</span>
            <span className="text-sm font-medium">
              {invoices.length} /{" "}
              {planFeatures?.invoices_per_month === "Unlimited" ? "∞" : planFeatures?.invoices_per_month}
            </span>
          </div>
          {planFeatures?.invoices_per_month !== "Unlimited" && (
            <Progress
              value={(invoices.length / (planFeatures?.invoices_per_month as number)) * 100}
              className="h-2"
              color={invoices.length >= (planFeatures?.invoices_per_month as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>

        {/* Estimates Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Estimates</span>
            <span className="text-sm font-medium">
              {estimates.length} / {planFeatures?.estimates === "Unlimited" ? "∞" : planFeatures?.estimates}
            </span>
          </div>
          {planFeatures?.estimates !== "Unlimited" && (
            <Progress
              value={(estimates.length / (planFeatures?.estimates as number)) * 100}
              className="h-2"
              color={estimates.length >= (planFeatures?.estimates as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>

        {/* Receipts Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Receipts</span>
            <span className="text-sm font-medium">
              {receipts.length} / {planFeatures?.receipts === "Unlimited" ? "∞" : planFeatures?.receipts}
            </span>
          </div>
          {planFeatures?.receipts !== "Unlimited" && (
            <Progress
              value={(receipts.length / (planFeatures?.receipts as number)) * 100}
              className="h-2"
              color={receipts.length >= (planFeatures?.receipts as number) ? "bg-red-500" : undefined}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
