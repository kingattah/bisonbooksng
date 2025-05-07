"use client"

import { format } from "date-fns"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export function CurrentSubscription({ subscription }: { subscription: any }) {
  const isActive = subscription.status === "active"
  const isPending = subscription.status === "pending"
  const isCancelled = subscription.cancel_at_period_end
  const isFreePlan = subscription.subscription_plans?.name === "Free"

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy")
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Subscription</CardTitle>
        <CardDescription>
          {isActive
            ? isCancelled
              ? "Your subscription is active but will not renew"
              : "Your subscription is active"
            : isPending
              ? "Your subscription is pending payment"
              : "Your subscription is inactive"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1">
          <div className="text-xl font-bold">{subscription.subscription_plans?.name} Plan</div>
          <div className="text-sm text-muted-foreground">{subscription.subscription_plans?.description}</div>
        </div>

        <div className="grid gap-1">
          <div className="text-sm font-medium">Billing Period</div>
          <div className="text-sm">
            {isFreePlan
              ? "Free Plan (No billing)"
              : subscription.interval === "yearly"
                ? `Yearly (${formatDate(subscription.current_period_start)} - ${formatDate(subscription.current_period_end)})`
                : `Monthly (Renews on ${formatDate(subscription.current_period_end)})`}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-sm font-medium">Price</div>
          <div className="text-sm">
            {isFreePlan
              ? "Free"
              : `${new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: subscription.subscription_plans?.currency || "NGN",
                }).format(
                  subscription.subscription_plans?.price || 0,
                )} / ${subscription.interval === "yearly" ? "year" : "month"}`}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-sm font-medium">Status</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isActive ? "bg-green-500" : isPending ? "bg-yellow-500" : "bg-red-500"
              }`}
            ></span>
            <span className="text-sm">
              {isActive
                ? isCancelled
                  ? "Active (Cancels on " + formatDate(subscription.current_period_end) + ")"
                  : "Active"
                : isPending
                  ? "Pending Payment"
                  : "Inactive"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
