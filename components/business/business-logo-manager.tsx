"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Loader2, Upload } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Business {
  id: string
  name: string
  logo_base64: string | null
}

export function BusinessLogoManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchBusinesses()
  }, [])

  async function fetchBusinesses() {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("businesses").select("id, name, logo_base64").order("name")

      if (error) {
        throw error
      }

      setBusinesses(data || [])

      // Get the selected business ID from localStorage
      let selectedBusinessId = null
      if (typeof window !== "undefined") {
        selectedBusinessId = localStorage.getItem("selectedBusinessId")
      }

      if (selectedBusinessId && data) {
        const business = data.find((b) => b.id === selectedBusinessId)
        if (business) {
          setSelectedBusiness(business)
        } else if (data.length > 0) {
          // If the selected business isn't found, select the first one
          setSelectedBusiness(data[0])
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedBusinessId", data[0].id)
          }
        }
      } else if (data && data.length > 0) {
        setSelectedBusiness(data[0])
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedBusinessId", data[0].id)
        }
      }
    } catch (error: any) {
      console.error("Error fetching businesses:", error)
      setError(error.message || "Failed to load businesses")
      toast({
        title: "Error",
        description: error.message || "Failed to load businesses",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBusinessChange = (businessId: string) => {
    const business = businesses.find((b) => b.id === businessId)
    setSelectedBusiness(business || null)

    // Update localStorage when business changes
    if (business && typeof window !== "undefined") {
      localStorage.setItem("selectedBusinessId", business.id)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedBusiness) {
      return
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo image must be less than 2MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Convert file to base64
      const base64 = await convertFileToBase64(file)

      // Update the business record with the base64 string
      const { error } = await supabase.from("businesses").update({ logo_base64: base64 }).eq("id", selectedBusiness.id)

      if (error) {
        throw error
      }

      // Update local state
      setBusinesses(
        businesses.map((business) =>
          business.id === selectedBusiness.id ? { ...business, logo_base64: base64 } : business,
        ),
      )

      setSelectedBusiness((prev) => (prev ? { ...prev, logo_base64: base64 } : null))

      toast({
        title: "Logo updated",
        description: "Business logo has been updated successfully",
      })

      // Refresh businesses to ensure we have the latest data
      fetchBusinesses()
    } catch (error: any) {
      console.error("Error uploading logo:", error)
      setError(error.message || "Failed to upload business logo")
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload business logo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!selectedBusiness) return

    setIsRemoving(true)
    setError(null)

    try {
      const { error } = await supabase.from("businesses").update({ logo_base64: null }).eq("id", selectedBusiness.id)

      if (error) throw error

      // Update local state
      setBusinesses(
        businesses.map((business) =>
          business.id === selectedBusiness.id ? { ...business, logo_base64: null } : business,
        ),
      )

      setSelectedBusiness((prev) => (prev ? { ...prev, logo_base64: null } : null))

      toast({
        title: "Logo removed",
        description: "Business logo has been removed successfully",
      })

      // Refresh businesses to ensure we have the latest data
      fetchBusinesses()
    } catch (error: any) {
      console.error("Error removing logo:", error)
      setError(error.message || "Failed to remove business logo")
      toast({
        title: "Error",
        description: error.message || "Failed to remove business logo",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Failed to convert file to base64"))
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleRetry = () => {
    fetchBusinesses()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Logo Management</CardTitle>
        <CardDescription>Upload and manage logos for your businesses</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {businesses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No businesses found. Create a business first.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Select Business</label>
                  <Select
                    value={selectedBusiness?.id}
                    onValueChange={handleBusinessChange}
                    disabled={businesses.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBusiness && (
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <h3 className="text-lg font-medium mb-4">Logo for {selectedBusiness.name}</h3>

                      <div className="flex justify-center mb-4">
                        <div className="w-40 h-40 border rounded-md flex items-center justify-center overflow-hidden bg-white p-2">
                          {selectedBusiness.logo_base64 ? (
                            <img
                              src={selectedBusiness.logo_base64 || "/placeholder.svg"}
                              alt={`${selectedBusiness.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">No logo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("logo-upload")?.click()}
                          disabled={isUploading || !selectedBusiness}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {selectedBusiness.logo_base64 ? "Change Logo" : "Upload Logo"}
                            </>
                          )}
                        </Button>

                        <input
                          type="file"
                          id="logo-upload"
                          className="hidden"
                          accept="image/png,image/jpeg,image/gif,image/svg+xml"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />

                        {selectedBusiness.logo_base64 && (
                          <Button variant="destructive" onClick={handleRemoveLogo} disabled={isRemoving}>
                            {isRemoving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>Remove Logo</>
                            )}
                          </Button>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-4">
                        Recommended: Square image, 512×512 pixels or larger
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
