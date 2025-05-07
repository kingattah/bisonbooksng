import { getPaystackEnvironment, isPaystackLive } from "@/lib/paystack-environment"
import { PaystackEnvironmentIndicator } from "@/components/billing/paystack-environment-indicator"

export default function PaystackDebugPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Paystack Environment Debug</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Server-Side Environment</h2>
        <p className="mb-2">
          <span className="font-medium">Environment:</span> {getPaystackEnvironment()}
        </p>
        <p className="mb-4">
          <span className="font-medium">Using Live API:</span> {isPaystackLive() ? "Yes" : "No"}
        </p>

        <h2 className="text-xl font-semibold mb-4 mt-8">Client-Side Environment</h2>
        <p className="flex items-center">
          <span className="font-medium">Environment Indicator:</span>
          <PaystackEnvironmentIndicator />
        </p>

        <div className="mt-8 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Environment Variables (Masked)</h3>
          <p className="mb-1">
            <span className="font-medium">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:</span>
            {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
              ? `${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.substring(0, 8)}...`
              : "Not set"}
          </p>
          <p>
            <span className="font-medium">PAYSTACK_SECRET_KEY:</span>
            {process.env.PAYSTACK_SECRET_KEY ? "Set (masked for security)" : "Not set"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <a href="/billing" className="text-blue-600 hover:underline">
          Go to Billing Page
        </a>
      </div>
    </div>
  )
}
