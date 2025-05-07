"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, AlertCircle } from "lucide-react"
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
import { createReceipt } from "@/app/actions/receipt"
import { checkPlanLimit } from "@/lib/subscription-limits"

export function ReceiptCreateButton() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [nextReceiptNumber, setNextReceiptNumber] = useState("")
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [canCreateReceipt, setCanCreateReceipt] = useState(true)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [amount, setAmount] = useState<string>("0.00")
  const [paymentMethod, setPaymentMethod] = useState<string>("credit card")
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
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
      generateNextReceiptNumber(businessId)
    }
  }, [])

  // Check receipt limit when dialog opens
  useEffect(() => {
    if (open) {
      checkReceiptLimit()
    }
  }, [open])

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

  // Modify the checkReceiptLimit function to use checkPlanLimit
  const checkReceiptLimit = async () => {
    try {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Force refresh the session to get the latest subscription data
      await supabase.auth.refreshSession()

      // Count all receipts for this user
      const { data, error } = await supabase.from("receipts").select("id").eq("user_id", user.id)

      if (error) throw error

      const receiptCount = data?.length || 0

      // Check against plan limits
      const limitCheck = await checkPlanLimit("receipts", receiptCount)

      setCanCreateReceipt(limitCheck.allowed)
      setLimitError(limitCheck.allowed ? null : limitCheck.message)
    } catch (error: any) {
      console.error("Error checking receipt limit:", error)
      // Don't set an error message here to avoid confusing the user
    }
  }

  // Generate the next receipt number based on existing receipts
  const generateNextReceiptNumber = async (businessId: string) => {
    try {
      // Get the current year
      const currentYear = new Date().getFullYear()

      // Get the latest receipt for this business
      const { data, error } = await supabase
        .from("receipts")
        .select("receipt_number")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1

      // If there are existing receipts, extract the sequence number and increment
      if (data && data.length > 0) {
        const latestReceiptNumber = data[0].receipt_number
        const match = latestReceiptNumber.match(/RCT-\d+-(\d+)/)

        if (match && match[1]) {
          nextNumber = Number.parseInt(match[1], 10) + 1
        }
      }

      // Format: RCT-YYYY-SEQUENCE (e.g., RCT-2023-001)
      const formattedNumber = `RCT-${currentYear}-${nextNumber.toString().padStart(3, "0")}`
      setNextReceiptNumber(formattedNumber)
    } catch (error: any) {
      console.error("Error generating receipt number:", error)
      // Fallback to a timestamp-based number if there's an error
      const timestamp = Date.now()
      setNextReceiptNumber(`RCT-${timestamp}`)
    }
  }

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!selectedClientId) throw new Error("Client is required")
      if (!date) throw new Error("Date is required")
      if (!amount || Number.parseFloat(amount) <= 0) throw new Error("Amount must be greater than zero")
      if (!selectedBusinessId) throw new Error("No business selected")

      // Create form data
      const formData = new FormData()
      formData.append("business_id", selectedBusinessId)
      formData.append("client_id", selectedClientId)
      formData.append("receipt_number", nextReceiptNumber)
      formData.append("date", date)
      formData.append("amount", amount)
      formData.append("payment_method", paymentMethod)
      formData.append("notes", notes)

      // Use the server action to create the receipt
      const result = await createReceipt(formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Receipt created",
        description: "Your receipt has been created successfully",
      })

      setOpen(false)
      // Redirect to the receipt preview page
      router.push(`/receipts/${result.data.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create receipt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    // Reset form state
    setSelectedClientId("")
    setAmount("0.00")
    setPaymentMethod("credit card")
    setDate(new Date().toISOString().split("T")[0])
    setNotes("")

    // Regenerate receipt number
    if (selectedBusinessId) {
      generateNextReceiptNumber(selectedBusinessId)
    }
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
        <Button id="new-receipt-button">
          <Plus className="mr-2 h-4 w-4" />
          New Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Receipt</DialogTitle>
          <DialogDescription>
            Create a receipt for a payment received from a client. You can optionally link it to an invoice.
          </DialogDescription>
        </DialogHeader>

        {limitError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Plan Limit Reached</AlertTitle>
            <AlertDescription>{limitError}</AlertDescription>
            <Button
              variant="outline"
              className="mt-2 w-full border-red-300 hover:bg-red-100"
              onClick={() => router.push("/billing")}
            >
              Upgrade Plan
            </Button>
          </Alert>
        ) : (
          <form onSubmit={handleCreateReceipt}>
            <div className="grid gap-6 py-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receipt_number">Receipt Number</Label>
                      <Input id="receipt_number" value={nextReceiptNumber} readOnly className="mt-1 bg-muted" />
                    </div>

                    <div>
                      <Label htmlFor="client_id">Client</Label>
                      <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                        <SelectTrigger className="mt-1">
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

                    <div>
                      <Label htmlFor="date">Payment Date</Label>
                      <Input
                        id="date"
                        type="date"
                        required
                        className="mt-1"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="mt-1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit card">Credit Card</SelectItem>
                          <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
              <Button type="submit" disabled={isLoading || !canCreateReceipt}>
                {isLoading ? "Creating..." : "Create Receipt"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
