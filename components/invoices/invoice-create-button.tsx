"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash } from "lucide-react"
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
import { useLoading } from "@/components/loading/loading-context"
import { checkPlanLimit } from "@/lib/subscription-limits"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export function InvoiceCreateButton() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([
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
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("")
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [canCreateInvoice, setCanCreateInvoice] = useState(true)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [invoiceStatus, setInvoiceStatus] = useState<string>("draft")
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [notes, setNotes] = useState<string>("")

  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()
  const { setLoading } = useLoading()

  // Get the selected business ID from localStorage when component mounts
  useEffect(() => {
    const businessId = localStorage.getItem("selectedBusinessId")
    setSelectedBusinessId(businessId)

    if (businessId) {
      fetchClients(businessId)
      generateNextInvoiceNumber(businessId)
    }
  }, [])

  // Check invoice limit when dialog opens
  useEffect(() => {
    if (open) {
      checkInvoiceLimit()
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

  // Check if the user has reached their invoice limit
  const checkInvoiceLimit = async () => {
    try {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Count all invoices for this user
      const { data, error } = await supabase.from("invoices").select("id").eq("user_id", user.id)

      if (error) throw error

      const invoiceCount = data?.length || 0

      // Check against plan limits using the imported function
      const limitCheck = await checkPlanLimit("invoices_per_month", invoiceCount)

      if (!limitCheck.allowed) {
        setLimitError(limitCheck.message)
        setCanCreateInvoice(false)
      } else {
        setLimitError(null)
        setCanCreateInvoice(true)
      }
    } catch (error: any) {
      console.error("Error checking invoice limit:", error)
      // Don't set an error message here to avoid confusing the user
    }
  }

  // Generate the next invoice number based on existing invoices
  const generateNextInvoiceNumber = async (businessId: string) => {
    try {
      // Get the current year
      const currentYear = new Date().getFullYear()

      // Get the latest invoice for this business
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1

      // If there are existing invoices, extract the sequence number and increment
      if (data && data.length > 0) {
        const latestInvoiceNumber = data[0].invoice_number
        const match = latestInvoiceNumber.match(/INV-\d+-(\d+)/)

        if (match && match[1]) {
          nextNumber = Number.parseInt(match[1], 10) + 1
        }
      }

      // Format: INV-YYYY-SEQUENCE (e.g., INV-2023-001)
      const formattedNumber = `INV-${currentYear}-${nextNumber.toString().padStart(3, "0")}`
      setNextInvoiceNumber(formattedNumber)
    } catch (error: any) {
      console.error("Error generating invoice number:", error)
      // Fallback to a timestamp-based number if there's an error
      const timestamp = Date.now()
      setNextInvoiceNumber(`INV-${timestamp}`)
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an invoice",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    // Show global loading screen
    setLoading(true, "Creating your invoice...", "invoice-creation")

    const businessId = selectedBusinessId

    if (!businessId) {
      toast({
        title: "Error",
        description: "No business selected",
        variant: "destructive",
      })
      setIsLoading(false)
      setLoading(false)
      return
    }

    try {
      // Check invoice limit again before creating
      const { data: invoiceData, error: invoiceCountError } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", user.id)

      if (invoiceCountError) throw invoiceCountError

      const invoiceCount = invoiceData?.length || 0

      // Check against plan limits
      const limitCheck = await checkPlanLimit("invoices_per_month", invoiceCount)

      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message)
      }

      // Validate required fields
      if (!selectedClientId) throw new Error("Client is required")
      if (!issueDate) throw new Error("Issue date is required")
      if (!dueDate) throw new Error("Due date is required")

      // Validate invoice items
      if (items.some((item) => !item.description || item.quantity <= 0)) {
        throw new Error("All invoice items must have a description and quantity greater than zero")
      }

      // 1. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId,
          client_id: selectedClientId,
          user_id: user.id, // Add the user_id field
          invoice_number: nextInvoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          status: invoiceStatus,
          total_amount: totalAmount,
          notes: notes,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 2. Create the invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }))

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

      if (itemsError) throw itemsError

      toast({
        title: "Invoice created",
        description: "Your invoice has been created successfully",
      })

      setOpen(false)
      // Redirect to the invoice preview page
      router.push(`/invoices/${invoice.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      // Hide global loading screen
      setLoading(false)
    }
  }

  const resetForm = () => {
    // Reset form state
    setSelectedClientId("")
    setInvoiceStatus("draft")
    setIssueDate(new Date().toISOString().split("T")[0])
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
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

    // Regenerate invoice number
    if (selectedBusinessId) {
      generateNextInvoiceNumber(selectedBusinessId)
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
        <Button id="new-invoice-button">
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for your client. The invoice number is generated automatically.
          </DialogDescription>
        </DialogHeader>

        {limitError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Limit Reached! </strong>
            <span className="block sm:inline">{limitError}</span>
            <div className="mt-2">
              <Button
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => router.push("/billing")}
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={createInvoice}>
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
                        <Label className="text-base">Invoice Information</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label htmlFor="invoice_number">Invoice Number</Label>
                            <Input id="invoice_number" value={nextInvoiceNumber} readOnly className="mt-1 bg-muted" />
                          </div>
                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
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
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          required
                          className="mt-1"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card>
                <CardContent className="pt-6">
                  <Label className="text-base">Invoice Items</Label>
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
              <Button type="submit" disabled={isLoading || !!limitError}>
                {isLoading ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
