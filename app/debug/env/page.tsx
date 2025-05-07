import { EnvironmentChecker } from "@/components/debug/env-checker"

export default function EnvironmentDebugPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Environment Variables Debug</h1>
      <EnvironmentChecker />

      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Next Steps</h2>
        <p className="mb-4">
          If you're seeing "Not set" for any required environment variables, follow the troubleshooting steps above.
        </p>
        <p>
          After setting up your environment variables correctly, restart your development server and try accessing your
          application again.
        </p>
      </div>
    </div>
  )
}
