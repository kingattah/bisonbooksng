"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { ReceiptAttachments } from "@/components/receipts/receipt-attachments"

interface Receipt {
  id: string
  business_id: string
  client_id: string
  invoice_id: string | null
  receipt_number: string
  date: string
  amount: number
  payment_method: string
  notes?: string
  clients: {
    id: string
    name: string
    email: string
  }
  invoices?: {
    id: string
    invoice_number: string
  } | null
}

interface Client {
  id: string
  name: string
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  status: string
  client_id: string
  due_date?: string
}

interface ReceiptEditFormProps {
  receipt: Receipt
  clients: Client[]
  invoices: Invoice[]
}

export function ReceiptEditForm({ receipt, clients, invoices }: ReceiptEditFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(receipt.client_id)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(receipt.invoice_id || "no-invoice")
  const [amount, setAmount] = useState(receipt.amount.toString())
  const [receiptNumber, setReceiptNumber] = useState(receipt.receipt_number)
  const [date, setDate] = useState(receipt.date)
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Initialize client invoices on component mount
  useEffect(() => {
    // Filter invoices for the current client
    const initialClientInvoices = invoices.filter((inv) => inv.client_id === selectedClientId)

    // Add the current invoice to the list if it's not already there
    // (it might not be in "sent" status anymore if it's already paid)
    if (receipt.invoice_id && !initialClientInvoices.some((inv) => inv.id === receipt.invoice_id)) {
      const currentInvoice = invoices.find((inv) => inv.id === receipt.invoice_id)
      if (currentInvoice) {
        initialClientInvoices.push(currentInvoice)
      }
    }

    setClientInvoices(initialClientInvoices)
  }, [])

  // Update client invoices when client changes
  useEffect(() => {
    if (selectedClientId !== receipt.client_id) {
      fetchClientInvoices(selectedClientId)
    }
  }, [selectedClientId])

  // Auto-fill details when invoice changes
  useEffect(() => {
    if (selectedInvoiceId && selectedInvoiceId !== "no-invoice") {
      const invoice = clientInvoices.find((inv) => inv.id === selectedInvoiceId)
      if (invoice) {
        // Auto-fill amount
        setAmount(invoice.total_amount.toString())

        // Auto-generate receipt number based on invoice number if it's a new selection
        if (selectedInvoiceId !== receipt.invoice_id) {
          setReceiptNumber(`REC-${invoice.invoice_number}`)
        }
      }
    }
  }, [selectedInvoiceId, clientInvoices])

  const fetchClientInvoices = async (clientId: string) => {
    try {
      // Fetch invoices for this client that are in "sent" status (unpaid)
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, status, client_id, due_date")
        .eq("business_id", receipt.business_id)
        .eq("client_id", clientId)
        .eq("status", "sent") // Only show unpaid invoices
        .order("created_at", { ascending: false })

      if (error) throw error

      setClientInvoices(data || [])
      setSelectedInvoiceId("no-invoice")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load invoices",
        variant: "destructive",
      })
    }
  }

  const updateReceipt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get("client_id") as string
    const invoiceId = formData.get("invoice_id") as string
    const receiptNumberValue = formData.get("receipt_number") as string
    const dateValue = formData.get("date") as string
    const paymentMethod = formData.get("payment_method") as string
    const amountValue = formData.get("amount") as string
    const notes = formData.get("notes") as string

    try {
      // Validate required fields
      if (!clientId) throw new Error("Client is required")
      if (!receiptNumberValue) throw new Error("Receipt number is required")
      if (!dateValue) throw new Error("Date is required")
      if (!amountValue || Number.parseFloat(amountValue) <= 0) throw new Error("Amount must be greater than zero")

      // Check if the invoice has changed
      const originalInvoiceId = receipt.invoice_id
      const newInvoiceId = invoiceId === "no-invoice" ? null : invoiceId

      // 1. Update the receipt
      const { error: receiptError } = await supabase
        .from("receipts")
        .update({
          client_id: clientId,
          invoice_id: newInvoiceId,
          receipt_number: receiptNumberValue,
          date: dateValue,
          amount: Number.parseFloat(amountValue),
          payment_method: paymentMethod,
          notes,
          // Keep the original business_id to ensure it stays with the same business
          business_id: receipt.business_id,
        })
        .eq("id", receipt.id)

      if (receiptError) throw receiptError

      // 2. If the invoice has changed, update the invoice statuses
      if (originalInvoiceId !== newInvoiceId) {
        // If there was a previous invoice, set its status back to "sent"
        if (originalInvoiceId) {
          const { error: resetError } = await supabase
            .from("invoices")
            .update({ status: "sent" })
            .eq("id", originalInvoiceId)

          if (resetError) throw resetError
        }

        // If there's a new invoice, set its status to "paid"
        if (newInvoiceId) {
          const { error: updateError } = await supabase
            .from("invoices")
            .update({ status: "paid" })
            .eq("id", newInvoiceId)

          if (updateError) throw updateError
        }
      }

      toast({
        title: "Receipt updated",
        description: "Your receipt has been updated successfully",
      })

      // Redirect to the receipt preview page
      router.push(`/receipts/${receipt.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={updateReceipt} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="receipt_number">Receipt Number</Label>
              <Input
                id="receipt_number"
                name="receipt_number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select name="client_id" value={selectedClientId} onValueChange={setSelectedClientId} required>
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
              <Label htmlFor="invoice_id">Invoice (Optional)</Label>
              <Select
                name="invoice_id"
                value={selectedInvoiceId}
                onValueChange={setSelectedInvoiceId}
                disabled={clientInvoices.length === 0 && selectedInvoiceId === "no-invoice"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-invoice">No invoice (manual payment)</SelectItem>
                  {clientInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ₦{Number(invoice.total_amount).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientId && clientInvoices.length === 0 && selectedInvoiceId === "no-invoice" && (
                <p className="text-xs text-muted-foreground mt-1">No unpaid invoices found for this client</p>
              )}
            </div>

            <div>
              <Label htmlFor="date">Payment Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" defaultValue={receipt.payment_method}>
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
                name="notes"
                placeholder="Enter any additional notes here"
                className="mt-1"
                defaultValue={receipt.notes || ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Attachments */}
      <ReceiptAttachments receiptId={receipt.id} businessId={receipt.business_id} />

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/receipts/${receipt.id}/preview`)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
