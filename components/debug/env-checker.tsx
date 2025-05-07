"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type EnvVarStatus = {
  name: string
  isSet: boolean
  isRequired: boolean
  category: "supabase" | "paystack" | "app" | "other"
}

export function EnvironmentChecker() {
  const [envVars, setEnvVars] = useState<EnvVarStatus[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Check environment variables
    const vars: EnvVarStatus[] = [
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        isSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        isRequired: true,
        category: "supabase",
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        isSet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        isRequired: true,
        category: "supabase",
      },
      {
        name: "NEXT_PUBLIC_APP_URL",
        isSet: !!process.env.NEXT_PUBLIC_APP_URL,
        isRequired: true,
        category: "app",
      },
      {
        name: "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
        isSet: !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        isRequired: false,
        category: "paystack",
      },
    ]

    setEnvVars(vars)
  }, [])

  if (!isClient) {
    return <div>Loading environment variables...</div>
  }

  const missingRequired = envVars.filter((v) => v.isRequired && !v.isSet)
  const hasErrors = missingRequired.length > 0

  return (
    <div className="space-y-6">
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Required Environment Variables</AlertTitle>
          <AlertDescription>
            Your application is missing required environment variables. Please add them to your .env.local file.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Status</CardTitle>
          <CardDescription>Check the status of your environment variables below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["supabase", "paystack", "app", "other"].map((category) => {
              const categoryVars = envVars.filter((v) => v.category === category)
              if (categoryVars.length === 0) return null

              return (
                <div key={category} className="space-y-2">
                  <h3 className="text-lg font-medium capitalize">{category}</h3>
                  <div className="grid gap-2">
                    {categoryVars.map((v) => (
                      <div key={v.name} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          {v.isSet ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-mono text-sm">{v.name}</span>
                          {v.isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <Badge variant={v.isSet ? "success" : "destructive"}>{v.isSet ? "Set" : "Not set"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Create a <code className="bg-muted px-1 rounded">.env.local</code> file in your project root
              </li>
              <li>
                Add the following variables to your .env.local file:
                <pre className="bg-muted p-2 rounded mt-2 overflow-x-auto text-xs">
                  {missingRequired.map((v) => `${v.name}=your_${v.name.toLowerCase()}_here`).join("\n")}
                </pre>
              </li>
              <li>Restart your development server</li>
              <li>Refresh this page to check if the variables are properly set</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
