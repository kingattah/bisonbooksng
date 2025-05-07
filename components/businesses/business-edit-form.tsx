"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { FileAttachments } from "@/components/ui/file-attachments"
import { uploadFile, getAttachments } from "@/lib/storage-utils"

interface Business {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_number?: string | null
  logo_url?: string | null
}

interface BusinessEditFormProps {
  business: Business
}

export function BusinessEditForm({ business }: BusinessEditFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url)
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchAttachments()
  }, [])

  const fetchAttachments = async () => {
    try {
      setIsLoadingAttachments(true)
      const data = await getAttachments("business", business.id)
      setAttachments(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load attachments",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAttachments(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, "business", business.id, business.id)
      setLogoUrl(result.url)

      // Update the business with the new logo URL
      const { error } = await supabase.from("businesses").update({ logo_url: result.url }).eq("id", business.id)

      if (error) throw error

      toast({
        title: "Logo uploaded",
        description: "Your business logo has been updated successfully",
      })

      // Refresh attachments
      fetchAttachments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      })
    }
  }

  const handleAttachmentDelete = () => {
    // Refresh attachments after deletion
    fetchAttachments()
  }

  const updateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const tax_number = formData.get("tax_number") as string

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name,
          email,
          phone,
          address,
          tax_number,
          logo_url: logoUrl,
        })
        .eq("id", business.id)

      if (error) throw error

      toast({
        title: "Business updated",
        description: "Your business has been updated successfully",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update business",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={updateBusiness} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" name="name" defaultValue={business.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={business.email || ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={business.phone || ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={business.address || ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tax_number">Tax Number</Label>
            <Input id="tax_number" name="tax_number" defaultValue={business.tax_number || ""} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Current Logo</p>
              <img
                src={logoUrl || "/placeholder.svg"}
                alt={business.name}
                className="h-32 w-auto object-contain border rounded-md p-2"
              />
            </div>
          )}

          <FileUpload onUpload={handleLogoUpload} accept="image/*" maxSize={2} buttonText="Upload Logo" />

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Attachments</h3>
            {isLoadingAttachments ? (
              <p className="text-sm text-muted-foreground">Loading attachments...</p>
            ) : (
              <FileAttachments attachments={attachments} entityType="business" onDelete={handleAttachmentDelete} />
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
