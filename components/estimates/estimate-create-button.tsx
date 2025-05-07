"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash, AlertCircle } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { refreshSubscriptionData } from "@/app/actions/subscription"

interface EstimateItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export function EstimateCreateButton() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<EstimateItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ])
  const [totalAmount, setTotalAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [nextEstimateNumber, setNextEstimateNumber] = useState("")
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [estimateStatus, setEstimateStatus] = useState<string>("draft")
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [expiryDate, setExpiryDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [notes, setNotes] = useState<string>("")

  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Get the selected business ID from localStorage when component mounts
  useEffect(() => {
    const businessId = localStorage.getItem("selectedBusinessId")
    setSelectedBusinessId(businessId)

    if (businessId) {
      fetchClients(businessId)
      generateNextEstimateNumber(businessId)
    }
  }, [])

  const fetchClients = async (businessId: string) => {
    if (!businessId) return

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name")

      if (error) throw error
      setClients(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load clients",
        variant: "destructive",
      })
    }
  }

  // Generate the next estimate number based on existing estimates
  const generateNextEstimateNumber = async (businessId: string) => {
    try {
      // Get the current year
      const currentYear = new Date().getFullYear()

      // Get the latest estimate for this business
      const { data, error } = await supabase
        .from("estimates")
        .select("estimate_number")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1

      // If there are existing estimates, extract the sequence number and increment
      if (data && data.length > 0) {
        const latestEstimateNumber = data[0].estimate_number
        const match = latestEstimateNumber.match(/EST-\d+-(\d+)/)

        if (match && match[1]) {
          nextNumber = Number.parseInt(match[1], 10) + 1
        }
      }

      // Format: EST-YYYY-SEQUENCE (e.g., EST-2023-001)
      const formattedNumber = `EST-${currentYear}-${nextNumber.toString().padStart(3, "0")}`
      setNextEstimateNumber(formattedNumber)
    } catch (error: any) {
      console.error("Error generating estimate number:", error)
      // Fallback to a timestamp-based number if there's an error
      const timestamp = Date.now()
      setNextEstimateNumber(`EST-${timestamp}`)
    }
  }

  // Calculate total amount whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    setTotalAmount(total)
  }, [items])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) {
      return // Don't remove the last item
    }
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof EstimateItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Recalculate amount if quantity or unit_price changes
          if (field === "quantity" || field === "unit_price") {
            updatedItem.amount = updatedItem.quantity * updatedItem.unit_price
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an estimate",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const businessId = selectedBusinessId

    if (!businessId) {
      toast({
        title: "Error",
        description: "No business selected",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // Validate required fields
      if (!selectedClientId) throw new Error("Client is required")
      if (!issueDate) throw new Error("Issue date is required")
      if (!expiryDate) throw new Error("Expiry date is required")

      // Validate estimate items
      if (items.some((item) => !item.description || item.quantity <= 0)) {
        throw new Error("All estimate items must have a description and quantity greater than zero")
      }

      // 1. Create the estimate
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert({
          business_id: businessId,
          client_id: selectedClientId,
          user_id: user.id,
          estimate_number: nextEstimateNumber,
          issue_date: issueDate,
          expiry_date: expiryDate,
          status: estimateStatus,
          total_amount: totalAmount,
          notes: notes,
        })
        .select()
        .single()

      if (estimateError) {
        // Check if the error is due to plan limits
        if (estimateError.message.includes("Plan limit reached")) {
          setLimitError(estimateError.message)
        } else {
          console.error("Error creating estimate:", estimateError)
          toast({
            title: "Error",
            description: estimateError.message || "Failed to create estimate",
            variant: "destructive",
          })
        }
        return
      }

      // 2. Create the estimate items
      const estimateItems = items.map((item) => ({
        estimate_id: estimate.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }))

      const { error: itemsError } = await supabase.from("estimate_items").insert(estimateItems)

      if (itemsError) throw itemsError

      toast({
        title: "Estimate created",
        description: "Your estimate has been created successfully",
      })

      setOpen(false)
      // Redirect to the estimate preview page
      router.push(`/estimates/${estimate.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create estimate",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    // Reset form state
    setSelectedClientId("")
    setEstimateStatus("draft")
    setIssueDate(new Date().toISOString().split("T")[0])
    setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    setNotes("")

    // Reset items
    setItems([
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ])
    setTotalAmount(0)

    // Regenerate estimate number
    if (selectedBusinessId) {
      generateNextEstimateNumber(selectedBusinessId)
    }
  }

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true)
    try {
      await refreshSubscriptionData()
      toast({
        title: "Subscription Refreshed",
        description: "Your subscription data has been refreshed.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh subscription.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const createEstimate = (e: React.FormEvent) => {
    handleCreateEstimate(e)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (newOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button id="new-estimate-button">
          <Plus className="mr-2 h-4 w-4" />
          New Estimate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Estimate</DialogTitle>
          <DialogDescription>
            Create a new estimate for your client. The estimate number is generated automatically.
          </DialogDescription>
          {limitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Plan Limit Reached</AlertTitle>
              <AlertDescription>{limitError}</AlertDescription>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="border-red-300 hover:bg-red-100"
                  onClick={() => router.push("/billing")}
                >
                  Upgrade Plan
                </Button>
                <Button variant="outline" onClick={handleRefreshSubscription} disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing..." : "Refresh Subscription"}
                </Button>
              </div>
            </Alert>
          )}
        </DialogHeader>
        <form onSubmit={createEstimate}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client_id" className="text-base">
                        Client Information
                      </Label>
                      <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.length === 0 ? (
                            <SelectItem value="no-clients" disabled>
                              No clients found
                            </SelectItem>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">Estimate Information</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="estimate_number">Estimate Number</Label>
                          <Input id="estimate_number" value={nextEstimateNumber} readOnly className="mt-1 bg-muted" />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={estimateStatus} onValueChange={setEstimateStatus}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="issue_date">Issue Date</Label>
                      <Input
                        id="issue_date"
                        type="date"
                        required
                        className="mt-1"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        required
                        className="mt-1"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimate Items */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base">Estimate Items</Label>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-12 gap-2 font-medium text-sm">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>

                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" className="mt-4" onClick={addItem}>
                  Add Item
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="total_amount" className="text-base">
                      Total Amount
                    </Label>
                    <div className="text-xl font-bold">₦{totalAmount.toFixed(2)}</div>
                  </div>
                  <Input id="total_amount" type="hidden" value={totalAmount} />

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes here"
                      className="mt-1"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
