"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { InvoiceAttachments } from "@/components/invoices/invoice-attachments"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Invoice {
  id: string
  business_id: string
  client_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  total_amount: number
  notes?: string
  clients: {
    id: string
    name: string
    email: string
  }
}

interface Client {
  id: string
  name: string
}

interface InvoiceEditFormProps {
  invoice: Invoice
  invoiceItems: InvoiceItem[]
  clients: Client[]
}

export function InvoiceEditForm({ invoice, invoiceItems, clients }: InvoiceEditFormProps) {
  const [items, setItems] = useState<InvoiceItem[]>(
    invoiceItems.length > 0
      ? invoiceItems
      : [
          {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            unit_price: 0,
            amount: 0,
          },
        ],
  )
  const [totalAmount, setTotalAmount] = useState(invoice.total_amount)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(invoice.business_id)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

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

  const updateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get("client_id") as string
    const invoiceNumber = formData.get("invoice_number") as string
    const issueDate = formData.get("issue_date") as string
    const dueDate = formData.get("due_date") as string
    const status = formData.get("status") as string
    const notes = formData.get("notes") as string

    try {
      // Validate required fields
      if (!clientId) throw new Error("Client is required")
      if (!invoiceNumber) throw new Error("Invoice number is required")
      if (!issueDate) throw new Error("Issue date is required")
      if (!dueDate) throw new Error("Due date is required")

      // Validate invoice items
      if (items.some((item) => !item.description || item.quantity <= 0)) {
        throw new Error("All invoice items must have a description and quantity greater than zero")
      }

      // 1. Update the invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          client_id: clientId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          status: status,
          total_amount: totalAmount,
          notes,
          // Keep the original business_id to ensure it stays with the same business
          business_id: invoice.business_id,
        })
        .eq("id", invoice.id)

      if (invoiceError) throw invoiceError

      // 2. Delete existing invoice items
      const { error: deleteError } = await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id)

      if (deleteError) throw deleteError

      // 3. Create new invoice items
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
        title: "Invoice updated",
        description: "Your invoice has been updated successfully",
      })

      // Redirect to the invoice preview page
      router.push(`/invoices/${invoice.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={updateInvoice} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select name="client_id" defaultValue={invoice.client_id} required>
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
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                name="invoice_number"
                defaultValue={invoice.invoice_number}
                className="mt-1"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                name="issue_date"
                type="date"
                defaultValue={invoice.issue_date}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                defaultValue={invoice.due_date}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={invoice.status}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
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
            <Input id="total_amount" name="total_amount" type="hidden" value={totalAmount} />

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Enter any additional notes here"
                className="mt-1"
                defaultValue={invoice.notes || ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Attachments */}
      <InvoiceAttachments invoiceId={invoice.id} businessId={invoice.business_id} />

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/invoices/${invoice.id}/preview`)}
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
