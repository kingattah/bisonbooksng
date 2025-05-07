"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { verifySubscriptionPayment } from "@/app/actions/subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

type Status = "loading" | "success" | "error"

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("Verifying your payment...")
  const subscriptionId = searchParams.get("subscription_id")

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    if (!reference || !subscriptionId) {
      setStatus("error")
      setMessage("Missing payment reference or subscription ID")
      return
    }

    const verifyPayment = async () => {
      try {
        console.log("Starting payment verification process...")

        const result = await verifySubscriptionPayment(reference, subscriptionId)
        console.log("Verification result:", result)

        if (result.success) {
          setStatus("success")
          setMessage("Payment verified successfully! Your subscription is now active.")

          // Clear any cached data
          localStorage.removeItem("subscriptionCache")

          // Force a reload of the page after a short delay
          setTimeout(() => {
            window.location.href = "/billing"
          }, 3000)
        } else {
          setStatus("error")
          setMessage("Failed to verify payment. Please contact support.")
        }
      } catch (error) {
        console.error("Error verifying payment:", error)
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "An error occurred while verifying your payment")
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Verification</CardTitle>
          <CardDescription>Please wait while we verify your payment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center">{message}</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Please do not leave this page. The verification process is automatic and will redirect you when complete.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-center">{message}</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                You will be redirected to the billing page shortly.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-center">{message}</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Please contact support if you need assistance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
