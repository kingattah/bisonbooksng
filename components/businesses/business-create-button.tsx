"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { checkPlanLimit } from "@/lib/subscription-limits"

export function BusinessCreateButton() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canCreateBusiness, setCanCreateBusiness] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Check if the user can create more businesses
  useEffect(() => {
    const checkBusinessLimit = async () => {
      try {
        const supabase = createClient()
        const { data: businesses } = await supabase.from("businesses").select("id")

        if (businesses) {
          const limitCheck = await checkPlanLimit("businesses", businesses.length)
          setCanCreateBusiness(limitCheck.allowed)
          if (!limitCheck.allowed) {
            setError(limitCheck.message)
          }
        }
      } catch (err) {
        console.error("Error checking business limit:", err)
      }
    }

    if (open) {
      checkBusinessLimit()
    }
  }, [open])

  const createBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // If the user can't create more businesses, show an error and don't proceed
    if (!canCreateBusiness) {
      setError("You've reached your plan limit for businesses. Please upgrade your plan to add more.")
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string

    try {
      // Make the API call to create the business
      const { error: apiError } = await supabase.from("businesses").insert({
        name,
        email,
        phone,
        address,
      })

      if (apiError) {
        throw apiError
      }

      toast({
        title: "Business created",
        description: "Your business has been created successfully",
      })

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      // Check if the error message contains information about plan limits
      if (error.message && error.message.includes("plan limit")) {
        setError(error.message)
      } else {
        setError(error.message || "Failed to create business")
      }

      toast({
        title: "Error",
        description: error.message || "Failed to create business",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="new-business-button">
          <Plus className="mr-2 h-4 w-4" />
          New Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create business</DialogTitle>
          <DialogDescription>Add a new business to manage invoices and expenses.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canCreateBusiness ? (
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              You've reached your plan limit for businesses. Please upgrade your plan to add more.
            </p>
            <Button onClick={() => router.push("/billing")} className="w-full">
              Upgrade Plan
            </Button>
          </div>
        ) : (
          <form onSubmit={createBusiness}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" placeholder="Acme Inc." required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="hello@acme.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+1 (555) 123-4567" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="123 Main St, City, Country" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading || !canCreateBusiness}>
                {isLoading ? "Creating..." : "Create Business"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
