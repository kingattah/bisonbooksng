import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyLoading() {
  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Verification</CardTitle>
          <CardDescription>Verifying your subscription payment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p>Verifying your payment...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
