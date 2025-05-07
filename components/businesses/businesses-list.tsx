"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, MoreHorizontal, Trash, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { checkPlanLimit } from "@/lib/subscription-limits"

interface Business {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

interface BusinessesListProps {
  businesses: Business[]
}

export function BusinessesList({ businesses }: BusinessesListProps) {
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [canAddMore, setCanAddMore] = useState(true)
  const [limitMessage, setLimitMessage] = useState("")

  useEffect(() => {
    const checkLimit = async () => {
      try {
        const limitCheck = await checkPlanLimit("businesses", businesses.length)
        setCanAddMore(limitCheck.allowed)
        setLimitMessage(limitCheck.message)
      } catch (error) {
        console.error("Error checking plan limits:", error)
      }
    }

    checkLimit()
  }, [businesses.length])

  const handleEdit = (business: Business) => {
    setEditingBusiness(business)
  }

  const handleDelete = (business: Business) => {
    setBusinessToDelete(business)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!businessToDelete) return

    const supabase = createClient()
    try {
      const { error } = await supabase.from("businesses").delete().eq("id", businessToDelete.id)

      if (error) {
        throw error
      }

      toast({
        title: "Business deleted",
        description: "The business has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete business",
        variant: "destructive",
      })
    }
  }

  const updateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!editingBusiness) return

    const supabase = createClient()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name,
          email,
          phone,
          address,
        })
        .eq("id", editingBusiness.id)

      if (error) {
        throw error
      }

      toast({
        title: "Business updated",
        description: "The business has been updated successfully",
      })

      setEditingBusiness(null)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update business",
        variant: "destructive",
      })
    }
  }

  if (businesses.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No businesses</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You have not created any businesses yet. Add one below.
          </p>
          <Button onClick={() => document.getElementById("new-business-button")?.click()} disabled={!canAddMore}>
            Add Business
          </Button>
          {!canAddMore && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Plan Limit Reached</AlertTitle>
              <AlertDescription>{limitMessage}</AlertDescription>
              <Button variant="outline" className="mt-2 w-full" onClick={() => router.push("/billing")}>
                Upgrade Plan
              </Button>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business) => (
          <Card key={business.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{business.name}</CardTitle>
                <CardDescription>{business.email}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(business)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(business)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {business.phone && <p className="text-sm">Phone: {business.phone}</p>}
              {business.address && <p className="text-sm">Address: {business.address}</p>}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  localStorage.setItem("selectedBusinessId", business.id)
                  router.push("/dashboard")
                  router.refresh()
                }}
              >
                Select Business
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!canAddMore && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plan Limit Reached</AlertTitle>
          <AlertDescription>{limitMessage}</AlertDescription>
          <Button variant="outline" className="mt-2" onClick={() => router.push("/billing")}>
            Upgrade Plan
          </Button>
        </Alert>
      )}

      {/* Edit Business Dialog */}
      <Dialog open={!!editingBusiness} onOpenChange={(open) => !open && setEditingBusiness(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit business</DialogTitle>
            <DialogDescription>Make changes to your business here.</DialogDescription>
          </DialogHeader>
          {editingBusiness && (
            <form onSubmit={updateBusiness}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Business name</Label>
                  <Input id="name" name="name" defaultValue={editingBusiness.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingBusiness.email || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editingBusiness.phone || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={editingBusiness.address || ""} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete business</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this business? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
