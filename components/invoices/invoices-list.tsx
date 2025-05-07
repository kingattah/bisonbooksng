"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash, CheckCircle } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { checkPlanLimit } from "@/lib/subscription-limits"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  total_amount: number
  clients: {
    id: string
    name: string
    email: string
  }
}

interface InvoicesListProps {
  invoices: Invoice[]
}

export function InvoicesList({ invoices: initialInvoices }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [canAddMore, setCanAddMore] = useState(true)
  const [limitMessage, setLimitMessage] = useState("")

  const supabase = useSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get the selected business ID from localStorage when component mounts
  useEffect(() => {
    const businessId = localStorage.getItem("selectedBusinessId")
    setSelectedBusinessId(businessId)

    if (businessId) {
      fetchInvoices(businessId)
    }

    // Add custom event listener for business changes
    const handleBusinessChange = (e: CustomEvent) => {
      const newBusinessId = e.detail
      setSelectedBusinessId(newBusinessId)
      if (newBusinessId) {
        fetchInvoices(newBusinessId)
      }
    }

    window.addEventListener("businessChanged", handleBusinessChange as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener("businessChanged", handleBusinessChange as EventListener)
    }
  }, [])

  // Update invoices when search params change
  useEffect(() => {
    if (selectedBusinessId) {
      fetchInvoices(selectedBusinessId)
    }
  }, [searchParams])

  // Check invoice limits
  useEffect(() => {
    const checkInvoiceLimits = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (!user.user) {
          return { canAddMore: false, message: "You must be logged in to create invoices" }
        }

        // Get all invoices for the user
        const { data: invoices } = await supabase.from("invoices").select("id").eq("user_id", user.user.id)

        const currentCount = invoices?.length || 0

        // Check against plan limits
        const limitCheck = await checkPlanLimit("invoices_per_month", currentCount)

        setCanAddMore(limitCheck.allowed)
        setLimitMessage(limitCheck.message)
      } catch (error) {
        console.error("Error checking invoice limits:", error)
      }
    }

    checkInvoiceLimits()
  }, [invoices, supabase])

  // Fetch invoices for the current business
  const fetchInvoices = async (businessId: string) => {
    if (!businessId) return

    try {
      setIsLoading(true)
      let query = supabase
        .from("invoices")
        .select(`
          *,
          clients (
            id,
            name,
            email
          )
        `)
        .eq("business_id", businessId)

      // Add search filter if search query exists
      const searchQuery = searchParams.get("q")
      if (searchQuery) {
        const searchTerm = `%${searchQuery}%`
        query = query.or(`invoice_number.ilike.${searchTerm},clients.name.ilike.${searchTerm}`)
      }

      // Order by creation date
      query = query.order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setInvoices(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = (invoice: Invoice) => {
    router.push(`/invoices/${invoice.id}/preview`)
  }

  const handleChangeStatus = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsStatusDialogOpen(true)
  }

  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      setIsLoading(true)

      // First delete invoice items
      const { error: itemsError } = await supabase.from("invoice_items").delete().eq("invoice_id", invoiceToDelete.id)

      if (itemsError) throw itemsError

      // Then delete the invoice
      const { error: invoiceError } = await supabase.from("invoices").delete().eq("id", invoiceToDelete.id)

      if (invoiceError) throw invoiceError

      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)

      // Refresh the invoices list
      if (selectedBusinessId) {
        fetchInvoices(selectedBusinessId)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateInvoiceStatus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedInvoice) return

    try {
      setIsLoading(true)
      const formData = new FormData(e.currentTarget)
      const status = formData.get("status") as string

      const { error } = await supabase.from("invoices").update({ status }).eq("id", selectedInvoice.id)

      if (error) throw error

      toast({
        title: "Status updated",
        description: `Invoice status has been updated to ${status}`,
      })

      setIsStatusDialogOpen(false)

      // Refresh the invoices list
      if (selectedBusinessId) {
        fetchInvoices(selectedBusinessId)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500"
      case "sent":
        return "bg-blue-500"
      case "overdue":
        return "bg-red-500"
      case "draft":
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">Loading invoices...</h3>
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No invoices</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {searchParams.get("q") 
              ? "No invoices found matching your search"
              : "You have not created any invoices yet. Add one below."}
          </p>
          <Button onClick={() => document.getElementById("new-invoice-button")?.click()} disabled={!canAddMore}>
            Add Invoice
          </Button>
          {!canAddMore && <p className="mt-2 text-sm text-destructive">{limitMessage}</p>}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.clients?.name || "No client"}</TableCell>
                <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                </TableCell>
                <TableCell className="text-right">₦{Number(invoice.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(invoice)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeStatus(invoice)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Change Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(invoice)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!canAddMore && (
        <div className="mt-4 p-4 border border-destructive/50 rounded-md bg-destructive/10">
          <p className="text-sm text-destructive">{limitMessage}</p>
          <Button variant="outline" className="mt-2" onClick={() => router.push("/billing")}>
            Upgrade Plan
          </Button>
        </div>
      )}

      {/* Change Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Invoice Status</DialogTitle>
            <DialogDescription>Update the status of invoice #{selectedInvoice?.invoice_number}</DialogDescription>
          </DialogHeader>
          <form onSubmit={updateInvoiceStatus}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={selectedInvoice?.status}>
                  <SelectTrigger>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
