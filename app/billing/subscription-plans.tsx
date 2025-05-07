"use client"

import { useState } from "react"
import { initializeSubscription } from "@/app/actions/subscription"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export function SubscriptionPlans({
  plans,
  currentSubscription,
}: {
  plans: any[]
  currentSubscription: any | null
}) {
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      setError(null)

      const result = await initializeSubscription(planId, selectedInterval)

      if (result.success) {
        if (result.paymentUrl) {
          // For paid plans, redirect to payment page
          window.location.href = result.paymentUrl
        } else {
          // For free plan, just refresh the page
          router.refresh()
        }
      } else {
        setError("Failed to initialize subscription. Please try again.")
      }
    } catch (err) {
      console.error("Error subscribing to plan:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const currentPlanId = currentSubscription?.plan_id
  const currentInterval = currentSubscription?.interval || "monthly"
  const isCurrentPlanCancelled = currentSubscription?.cancel_at_period_end
  const isCurrentPlanExpired = currentSubscription?.status === "expired"
  const isOnFreePlan = !currentSubscription || currentSubscription.subscription_plans?.name === "Free"
  const isPendingBasicPlan = currentSubscription?.status === "pending" && currentSubscription?.subscription_plans?.name === "Basic"

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center mb-8">
        <RadioGroup
          defaultValue={selectedInterval}
          onValueChange={(value) => setSelectedInterval(value as "monthly" | "yearly")}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly" className="cursor-pointer">
              Monthly
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yearly" id="yearly" />
            <Label htmlFor="yearly" className="cursor-pointer">
              Yearly <span className="text-green-600 font-medium">(Save 10%)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = selectedInterval === "yearly" ? Math.round(plan.price * 12 * 0.9) : plan.price
          const isCurrentPlan = currentPlanId === plan.id && currentInterval === selectedInterval
          const features = plan.features
            ? typeof plan.features === "string"
              ? JSON.parse(plan.features) as Record<string, string | number>
              : plan.features as Record<string, string | number>
            : {}

          // Show upgrade button for Basic plan if:
          // 1. User is on Free plan OR
          // 2. Current plan is expired OR
          // 3. Current plan is cancelled OR
          // 4. Current plan is pending Basic plan
          const showUpgradeButton = plan.name === "Basic" && 
            (isOnFreePlan || isCurrentPlanExpired || isCurrentPlanCancelled || isPendingBasicPlan)

          return (
            <Card key={plan.id} className={`flex flex-col ${isCurrentPlan ? "border-primary shadow-md" : ""}`}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {plan.name}
                  {isCurrentPlan && !isCurrentPlanCancelled && !isCurrentPlanExpired && !isPendingBasicPlan && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  )}
                  {isCurrentPlan && isCurrentPlanCancelled && (
                    <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">Cancelling</span>
                  )}
                  {isCurrentPlan && isCurrentPlanExpired && (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Expired</span>
                  )}
                  {isPendingBasicPlan && (
                    <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">Payment Pending</span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {price === 0
                      ? "Free"
                      : new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: plan.currency || "NGN",
                        }).format(price)}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground ml-1">
                      /{selectedInterval === "yearly" ? "year" : "month"}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 mt-6">
                  {Object.entries(features).map(([key, value]) => (
                    <li key={key} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        {value === "Unlimited" ? (
                          <span>
                            <span className="font-medium">Unlimited</span> {key.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span>
                            <span className="font-medium">{value}</span> {key.replace(/_/g, " ")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.name === "Free" ? (
                  <Link href="/dashboard" className="w-full">
                    <Button className="w-full" variant="outline">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                    disabled={
                      loading !== null || 
                      plan.name === "Enterprise" || 
                      (isCurrentPlan && !isCurrentPlanCancelled && !isCurrentPlanExpired && !isPendingBasicPlan) ||
                      (!showUpgradeButton && plan.name === "Basic")
                    }
                  className="w-full"
                    variant={isCurrentPlan && !isCurrentPlanCancelled && !isCurrentPlanExpired && !isPendingBasicPlan ? "outline" : "default"}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                    ) : plan.name === "Enterprise" ? (
                      "Coming Soon"
                    ) : isCurrentPlan && !isCurrentPlanCancelled && !isCurrentPlanExpired && !isPendingBasicPlan ? (
                      "Active Until " + new Date(currentSubscription.current_period_end).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })
                  ) : isCurrentPlan && isCurrentPlanCancelled ? (
                    "Reactivate"
                    ) : isPendingBasicPlan ? (
                      "Complete Payment"
                    ) : showUpgradeButton ? (
                      "Upgrade to Basic"
                  ) : (
                    "Subscribe"
                  )}
                </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
