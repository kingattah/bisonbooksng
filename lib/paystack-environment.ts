/**
 * Utility functions to help with Paystack environment management
 */

// Check if we're using the live Paystack API
export function isPaystackLive(): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || ""
  return secretKey.startsWith("sk_live_")
}

// Get the current Paystack environment name
export function getPaystackEnvironment(): string {
  return isPaystackLive() ? "Production" : "Test"
}

// Log Paystack environment information (for debugging)
export function logPaystackEnvironment(): void {
  console.log(`Paystack Environment: ${getPaystackEnvironment()}`)
  console.log(`Using Live API: ${isPaystackLive()}`)
}
