import { Suspense } from "react"
import { getSubscriptionPlans, getUserSubscription } from "@/app/actions/subscription"
import { SubscriptionPlans } from "@/app/billing/subscription-plans"
import { CurrentSubscription } from "@/app/billing/current-subscription"
import { PlanLimits } from "@/app/billing/plan-limits"
import { PaystackEnvironmentIndicator } from "@/components/billing/paystack-environment-indicator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function BillingContent() {
  const [plans, subscription] = await Promise.all([getSubscriptionPlans(), getUserSubscription()])

  return (
    <div className="space-y-8">
      {/* Current Subscription */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          Current Subscription
          <PaystackEnvironmentIndicator />
        </h2>
        {subscription ? (
          <CurrentSubscription subscription={subscription} />
        ) : (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No Active Subscription</AlertTitle>
            <AlertDescription>
              You don't have an active subscription. Choose a plan below to get started.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Plan Limits */}
      {subscription && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Usage & Limits</h2>
          <PlanLimits />
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <SubscriptionPlans plans={plans} currentSubscription={subscription} />
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Billing & Subscription</h1>

      <Suspense fallback={<BillingPageSkeleton />}>
        <BillingContent />
      </Suspense>
    </div>
  )
}

function BillingPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />

      <div>
        <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
        <Skeleton className="h-64 w-full" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Usage & Limits</h2>
        <Skeleton className="h-80 w-full" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}
