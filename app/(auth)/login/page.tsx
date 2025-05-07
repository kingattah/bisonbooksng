import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { LoginForm } from "@/components/auth/login-form"

// Add this to explicitly mark the page as dynamic
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Login | Bison Books Invoicing",
  description: "Login to your account to manage your invoices and finances",
}

export default async function LoginPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900">
          <Image
            src="/images/business-professional.png"
            alt="Authentication background"
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
          <Image src="/images/bisonbookslogo-removebg-preview.png" alt="Bison Books Logo" width={50} height={50} />
          Bison Books Invoicing
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "This platform has completely transformed how we manage our invoices and track our finances. It's
              intuitive, powerful, and saves us hours every week."
            </p>
            <footer className="text-sm">Sofia Davis, CFO at Acme Inc</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Enter your email to sign in to your account</p>
          </div>
          <LoginForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            <Link href="/register" className="hover:text-brand underline underline-offset-4">
              Don&apos;t have an account? Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
