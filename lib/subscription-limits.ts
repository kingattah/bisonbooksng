import { getUserSubscription } from "@/app/actions/subscription"

// Define types for plan features
export type PlanFeatures = {
  clients?: number | string
  expenses?: number | string
  businesses?: number | string
  invoices_per_month?: number | string
  estimates?: number | string
  receipts?: number | string
  [key: string]: number | string | undefined
}

// Define default free plan limits
export const DEFAULT_FREE_PLAN_LIMITS: PlanFeatures = {
  clients: 5,
  expenses: 5,
  businesses: 5,
  invoices_per_month: 5,
  estimates: 5,
  receipts: 5,
}

// Define premium plan defaults for missing features
export const PREMIUM_PLAN_DEFAULTS: PlanFeatures = {
  clients: "Unlimited",
  expenses: "Unlimited",
  businesses: "Unlimited",
  invoices_per_month: "Unlimited",
  estimates: "Unlimited",
  receipts: "Unlimited",
}

// Define types for limit check results
export type LimitCheckResult = {
  allowed: boolean
  message: string
  limit: number | string
  current: number
}

/**
 * Check if a user has reached their plan limit for a specific resource
 */
export async function checkPlanLimit(
  resourceType: keyof PlanFeatures,
  currentCount: number,
): Promise<LimitCheckResult> {
  // Get the user's current subscription
  const subscription = await getUserSubscription()

  console.log("Checking plan limit:", { resourceType, currentCount, subscription })
  console.log("Subscription plan details:", subscription?.subscription_plans)

  // If no subscription, use default free plan limits
  if (!subscription) {
    const limit = DEFAULT_FREE_PLAN_LIMITS[resourceType]
    console.log("Using free plan limits:", { limit })

    if (currentCount >= (limit as number)) {
      return {
        allowed: false,
        message: `You've reached your free plan limit of ${limit} ${resourceType}. Please upgrade your plan to add more.`,
        limit: limit as number,
        current: currentCount,
      }
    }

    return {
      allowed: true,
      message: `You can add ${(limit as number) - currentCount} more ${resourceType} on your free plan.`,
      limit: limit as number,
      current: currentCount,
    }
  }

  // Check if subscription is active
  if (subscription.status !== "active") {
    console.log("Subscription is not active:", subscription.status)
    // If subscription is pending, use free plan limits
    if (subscription.status === "pending") {
      const limit = DEFAULT_FREE_PLAN_LIMITS[resourceType]
      console.log("Using free plan limits for pending subscription:", { limit })

      if (currentCount >= (limit as number)) {
        return {
          allowed: false,
          message: `You've reached your free plan limit of ${limit} ${resourceType}. Your subscription will be activated once payment is confirmed.`,
          limit: limit as number,
          current: currentCount,
        }
      }

      return {
        allowed: true,
        message: `You can add ${(limit as number) - currentCount} more ${resourceType} on your free plan. Your subscription will be activated once payment is confirmed.`,
        limit: limit as number,
        current: currentCount,
      }
    }
  }

  // Get the plan features
  const planFeatures = subscription.subscription_plans?.features as PlanFeatures
  console.log("Plan features:", planFeatures)

  if (!planFeatures) {
    return {
      allowed: false,
      message: "Unable to determine plan limits. Please contact support.",
      limit: 0,
      current: currentCount,
    }
  }

  // Get the plan name
  const planName = subscription.subscription_plans?.name
  console.log("Plan name:", planName)

  // For paid plans (not Free), if the feature is missing, assume it's unlimited
  if (planName && planName !== "Free" && !planFeatures[resourceType]) {
    console.log(`Feature ${resourceType} not found in plan ${planName}, assuming unlimited`)
    return {
      allowed: true,
      message: `Your ${planName} plan allows unlimited ${resourceType}`,
      limit: "Unlimited",
      current: currentCount,
    }
  }

  // Get the limit for the requested resource
  const limit = planFeatures[resourceType] || DEFAULT_FREE_PLAN_LIMITS[resourceType]
  console.log("Resource limit:", { resourceType, limit })

  // If the limit is "Unlimited", allow the action
  if (limit === "Unlimited") {
    return {
      allowed: true,
      message: "Your plan allows unlimited " + resourceType,
      limit: "Unlimited",
      current: currentCount,
    }
  }

  // Convert limit to number for comparison
  const numericLimit = typeof limit === "number" ? limit : Number.parseInt(limit as string, 10)
  console.log("Numeric limit:", numericLimit, "Current count:", currentCount)

  // Check if the user has reached their limit
  if (currentCount >= numericLimit) {
    return {
      allowed: false,
      message: `You've reached your plan limit of ${numericLimit} ${resourceType}. Please upgrade your plan to add more.`,
      limit: numericLimit,
      current: currentCount,
    }
  }

  // User is within their limit
  return {
    allowed: true,
    message: `You can add ${numericLimit - currentCount} more ${resourceType} on your current plan.`,
    limit: numericLimit,
    current: currentCount,
  }
}
