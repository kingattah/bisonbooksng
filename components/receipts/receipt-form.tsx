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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createReceipt } from "@/app/actions/receipts"

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

interface ReceiptFormProps {
  clients: Client[]
  invoices: Invoice[]
  businessId: string
}

export function ReceiptForm({ clients, invoices, businessId }: ReceiptFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("no-invoice")
  const [amount, setAmount] = useState<string>("0")
  const [receiptNumber, setReceiptNumber] = useState<string>("")
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Update client invoices when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientInvoices(selectedClientId)
    }
  }, [selectedClientId])

  // Auto-fill details when invoice is selected
  useEffect(() => {
    if (selectedInvoiceId && selectedInvoiceId !== "no-invoice") {
      const invoice = clientInvoices.find((inv) => inv.id === selectedInvoiceId)
      if (invoice) {
        // Auto-fill amount
        setAmount(invoice.total_amount.toString())

        // Auto-generate receipt number based on invoice number
        setReceiptNumber(`REC-${invoice.invoice_number}`)

        // Set date to today if not already set
        if (!date) {
          setDate(new Date().toISOString().split("T")[0])
        }
      }
    }
  }, [selectedInvoiceId, clientInvoices])

  const fetchClientInvoices = async (clientId: string) => {
    try {
      // First, clear any previously selected invoice
      setSelectedInvoiceId("no-invoice")

      // Fetch invoices for this client that are in "sent" status (unpaid)
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, status, client_id, due_date")
        .eq("business_id", businessId)
        .eq("client_id", clientId)
        .eq("status", "sent") // Only show unpaid invoices
        .order("created_at", { ascending: false })

      if (error) throw error

      console.log("Fetched client invoices:", data)
      setClientInvoices(data || [])
    } catch (error: any) {
      console.error("Error fetching client invoices:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load invoices",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Add business ID to form data
      formData.append("business_id", businessId)

      // Use the server action to create the receipt
      const result = await createReceipt(formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Receipt created",
        description: "Your receipt has been created successfully",
      })

      router.push("/receipts")
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input
              id="receipt_number"
              name="receipt_number"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_id">Client</Label>
            <Select name="client_id" onValueChange={setSelectedClientId} required>
              <SelectTrigger>
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

          <div className="grid gap-2">
            <Label htmlFor="invoice_id">Invoice (Optional)</Label>
            <Select
              name="invoice_id"
              value={selectedInvoiceId}
              onValueChange={setSelectedInvoiceId}
              disabled={!selectedClientId || clientInvoices.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedClientId
                      ? "Select a client first"
                      : clientInvoices.length === 0
                        ? "No unpaid invoices found"
                        : "Select an invoice"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-invoice">No invoice (manual payment)</SelectItem>
                {clientInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - ${Number(invoice.total_amount).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && clientInvoices.length === 0 && (
              <p className="text-xs text-muted-foreground">No unpaid invoices found for this client</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Payment Date</Label>
            <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select name="payment_method" defaultValue="bank transfer">
              <SelectTrigger>
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

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Enter any additional notes here" />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Receipt"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
