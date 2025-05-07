"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash, CheckCircle, FileText } from "lucide-react"
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

interface EstimateItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Estimate {
  id: string
  estimate_number: string
  issue_date: string
  expiry_date: string
  status: string
  total_amount: number
  clients: {
    id: string
    name: string
    email: string
  }
}

interface EstimatesListProps {
  estimates: Estimate[]
}

export function EstimatesList({ estimates: initialEstimates }: EstimatesListProps) {
  const [estimates, setEstimates] = useState<Estimate[]>(initialEstimates)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null)
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Log initial estimates
  useEffect(() => {
    console.log("Initial estimates:", initialEstimates)
  }, [initialEstimates])

  // Get the selected business ID from localStorage when component mounts
  useEffect(() => {
    const businessId = localStorage.getItem("selectedBusinessId")
    console.log("Selected business ID:", businessId)
    setSelectedBusinessId(businessId)

    if (businessId) {
      fetchEstimates(businessId)
    }

    // Add custom event listener for business changes
    const handleBusinessChange = (e: CustomEvent) => {
      const newBusinessId = e.detail
      console.log("Business changed to:", newBusinessId)
      setSelectedBusinessId(newBusinessId)
      if (newBusinessId) {
        fetchEstimates(newBusinessId)
      }
    }

    window.addEventListener("businessChanged", handleBusinessChange as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener("businessChanged", handleBusinessChange as EventListener)
    }
  }, [])

  // Update estimates when search params change
  useEffect(() => {
    if (selectedBusinessId) {
      fetchEstimates(selectedBusinessId)
    }
  }, [searchParams])

  // Fetch estimates for the current business
  const fetchEstimates = async (businessId: string) => {
    if (!businessId) return

    try {
      setIsLoading(true)
      console.log("Fetching estimates for business:", businessId)
      
      let query = supabase
        .from("estimates")
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
        query = query.or(`estimate_number.ilike.${searchTerm},clients.name.ilike.${searchTerm}`)
      }

      // Order by creation date
      query = query.order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error("Error fetching estimates:", error)
        throw error
      }

      console.log("Fetched estimates:", data)
      setEstimates(data || [])
    } catch (error: any) {
      console.error("Error in fetchEstimates:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch estimates",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = (estimate: Estimate) => {
    router.push(`/estimates/${estimate.id}/preview`)
  }

  const handleChangeStatus = (estimate: Estimate) => {
    setSelectedEstimate(estimate)
    setIsStatusDialogOpen(true)
  }

  const handleConvertToInvoice = (estimate: Estimate) => {
    setSelectedEstimate(estimate)
    setIsConvertDialogOpen(true)
  }

  const handleDelete = (estimate: Estimate) => {
    setEstimateToDelete(estimate)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!estimateToDelete) return

    try {
      setIsLoading(true)

      // First delete estimate items
      const { error: itemsError } = await supabase
        .from("estimate_items")
        .delete()
        .eq("estimate_id", estimateToDelete.id)

      if (itemsError) throw itemsError

      // Then delete the estimate
      const { error } = await supabase.from("estimates").delete().eq("id", estimateToDelete.id)

      if (error) throw error

      toast({
        title: "Estimate deleted",
        description: "The estimate has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)

      // Refresh the estimates list
      if (selectedBusinessId) {
        fetchEstimates(selectedBusinessId)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete estimate",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateEstimateStatus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEstimate) return

    try {
      setIsLoading(true)
      const formData = new FormData(e.currentTarget)
      const status = formData.get("status") as string

      const { error } = await supabase.from("estimates").update({ status }).eq("id", selectedEstimate.id)

      if (error) throw error

      toast({
        title: "Status updated",
        description: `Estimate status has been updated to ${status}`,
      })

      setIsStatusDialogOpen(false)

      // Refresh the estimates list
      if (selectedBusinessId) {
        fetchEstimates(selectedBusinessId)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update estimate status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const convertToInvoice = async () => {
    if (!selectedEstimate) return

    try {
      setIsLoading(true)

      // 1. Get the estimate items
      const { data: estimateItems, error: itemsError } = await supabase
        .from("estimate_items")
        .select("*")
        .eq("estimate_id", selectedEstimate.id)

      if (itemsError) throw itemsError

      // 2. Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

      // 3. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          business_id: selectedBusinessId, // Use the actual business ID
          client_id: selectedEstimate.clients.id,
          invoice_number: invoiceNumber,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "draft",
          total_amount: selectedEstimate.total_amount,
          notes: `Converted from estimate #${selectedEstimate.estimate_number}`,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 4. Create invoice items
      const invoiceItems = estimateItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }))

      const { error: createItemsError } = await supabase.from("invoice_items").insert(invoiceItems)

      if (createItemsError) throw createItemsError

      // 5. Update estimate status to "converted"
      const { error: updateError } = await supabase
        .from("estimates")
        .update({ status: "converted" })
        .eq("id", selectedEstimate.id)

      if (updateError) throw updateError

      toast({
        title: "Estimate converted",
        description: "The estimate has been converted to an invoice successfully",
      })

      setIsConvertDialogOpen(false)

      // Redirect to the new invoice
      router.push(`/invoices/${invoice.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert estimate to invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500"
      case "sent":
        return "bg-blue-500"
      case "rejected":
        return "bg-red-500"
      case "converted":
        return "bg-purple-500"
      case "draft":
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading && estimates.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">Loading estimates...</h3>
        </div>
      </div>
    )
  }

  if (estimates.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No estimates</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You have not created any estimates yet. Add one below.
          </p>
          <Button onClick={() => document.getElementById("new-estimate-button")?.click()}>Add Estimate</Button>
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
              <TableHead>Estimate #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell className="font-medium">{estimate.estimate_number}</TableCell>
                <TableCell>{estimate.clients?.name || "No client"}</TableCell>
                <TableCell>{new Date(estimate.issue_date).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(estimate.expiry_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(estimate.status)}>{estimate.status}</Badge>
                </TableCell>
                <TableCell className="text-right">₦{Number(estimate.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(estimate)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeStatus(estimate)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Change Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleConvertToInvoice(estimate)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Convert to Invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(estimate)}>
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

      {/* Change Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Estimate Status</DialogTitle>
            <DialogDescription>Update the status of estimate #{selectedEstimate?.estimate_number}</DialogDescription>
          </DialogHeader>
          <form onSubmit={updateEstimateStatus}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={selectedEstimate?.status}>
                  <SelectTrigger>
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

      {/* Convert to Invoice Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to convert this estimate to an invoice? This will create a new invoice with the same
              items and mark this estimate as converted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={convertToInvoice} disabled={isLoading}>
              {isLoading ? "Converting..." : "Convert to Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete estimate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
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
