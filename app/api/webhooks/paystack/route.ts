import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import crypto from "crypto"
import { createServerClientSSR } from "@supabase/ssr"
import { supabaseEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"

// Create a server-side Supabase client for API routes
const createApiClient = () => {
  return createServerClientSSR<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get() {
        return undefined
      },
      set() {},
      remove() {},
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Verify that the request is from Paystack
    const signature = request.headers.get("x-paystack-signature")
    if (!signature) {
      return new NextResponse(JSON.stringify({ error: "No signature provided" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const body = await request.text()

    // Verify signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not defined")
      return new NextResponse(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the event
    let event
    try {
      event = JSON.parse(body)
    } catch (error) {
      console.error("Error parsing webhook payload:", error)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const eventType = event.event
    const data = event.data

    console.log(`Received Paystack webhook: ${eventType}`, data)

    const supabase = createApiClient()

    // Handle different event types
    switch (eventType) {
      case "charge.success":
        // Handle successful charge
        if (data.status === "success" && data.metadata && data.metadata.subscription_id) {
          console.log(`Processing successful charge for subscription: ${data.metadata.subscription_id}`)

          // Update the subscription
          const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              paystack_authorization_code: data.authorization?.authorization_code,
              paystack_customer_code: data.customer?.customer_code,
              current_period_start: data.created_at, // Use Paystack's created_at for accuracy
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              cancel_at_period_end: false, // Add this to ensure it's not canceled
              canceled_at: null, // Add this to clear any previous cancellation
              updated_at: new Date().toISOString(), // Update timestamp for cache invalidation
            })
            .eq("id", data.metadata.subscription_id)

          if (updateError) {
            console.error("Error updating subscription:", updateError)
            return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
          }

          // Create a subscription invoice
          const { error: invoiceError } = await supabase.from("subscription_invoices").insert({
            subscription_id: data.metadata.subscription_id,
            paystack_invoice_code: data.reference,
            amount: data.amount / 100, // Paystack amount is in kobo
            status: "paid",
            paid_at: new Date().toISOString(),
          })

          if (invoiceError) {
            console.error("Error creating invoice:", invoiceError)
            // Continue anyway, this is not critical
          }
        }
        break

      default:
        // Log unhandled event types
        console.log(`Unhandled Paystack event: ${eventType}`)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
