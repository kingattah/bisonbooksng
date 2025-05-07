import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { RegisterForm } from "@/components/auth/register-form"

// Add this to explicitly mark the page as dynamic
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Create an account | Bison Books Invoicing",
  description: "Create an account to start managing your invoices and finances",
}

export default async function RegisterPage() {
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
              "Managing multiple businesses has never been easier. The financial insights and reporting tools have
              helped us make better business decisions."
            </p>
            <footer className="text-sm">Alex Johnson, Entrepreneur</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your details below to create your account and get started
            </p>
          </div>
          <RegisterForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="#" className="hover:text-brand underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="hover:text-brand underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="px-8 text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-brand underline underline-offset-4">
              Already have an account? Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
