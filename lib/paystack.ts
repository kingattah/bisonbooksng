// Paystack API utility functions
import { logPaystackEnvironment } from "./paystack-environment"

/**
 * Create a payment link for subscription
 */
export async function createPaymentLink(email: string, amount: number, callbackUrl: string, metadata: any = {}) {
  try {
    // Log environment information for debugging
    logPaystackEnvironment()

    console.log("Creating Paystack payment link with:", { email, amount, callbackUrl, metadata })

    // Validate inputs for production environment
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address")
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than zero")
    }

    if (!callbackUrl) {
      throw new Error("Callback URL is required")
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not defined")
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo (smallest currency unit)
        callback_url: callbackUrl,
        metadata,
      }),
    })

    console.log("Paystack API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Paystack API error:", errorData)
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Paystack API response data:", data)

    if (!data.status) {
      throw new Error(data.message || "Failed to create payment link")
    }

    return data.data
  } catch (error) {
    console.error("Error creating payment link:", error)
    throw error
  }
}

/**
 * Verify a payment
 */
export async function verifyPayment(reference: string) {
  try {
    // Log environment information for debugging
    logPaystackEnvironment()

    if (!reference) {
      throw new Error("Payment reference is required")
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not defined")
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || "Failed to verify payment")
    }

    return data.data
  } catch (error) {
    console.error("Error verifying payment:", error)
    throw error
  }
}
