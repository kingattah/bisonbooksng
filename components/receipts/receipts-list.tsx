"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash } from "lucide-react"
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
import { checkPlanLimit } from "@/lib/subscription-limits"

interface Receipt {
  id: string
  receipt_number: string
  date: string
  amount: number
  payment_method: string
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

interface ReceiptsListProps {
  receipts: Receipt[]
}

export function ReceiptsList({ receipts: initialReceipts }: ReceiptsListProps) {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  const [canAddMore, setCanAddMore] = useState(true)
  const [limitMessage, setLimitMessage] = useState("")

  // Get the selected business ID from localStorage when component mounts
  useEffect(() => {
    const businessId = localStorage.getItem("selectedBusinessId")
    setSelectedBusinessId(businessId)

    if (businessId) {
      fetchReceipts(businessId)
    }

    // Add custom event listener for business changes
    const handleBusinessChange = (e: CustomEvent) => {
      const newBusinessId = e.detail
      setSelectedBusinessId(newBusinessId)
      if (newBusinessId) {
        fetchReceipts(newBusinessId)
      }
    }

    window.addEventListener("businessChanged", handleBusinessChange as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener("businessChanged", handleBusinessChange as EventListener)
    }
  }, [])

  // Check receipt limits
  useEffect(() => {
    const checkReceiptLimits = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (!user.user) {
          return { canAddMore: false, message: "You must be logged in to create receipts" }
        }

        // Get all receipts for the user
        const { data: receipts } = await supabase.from("receipts").select("id").eq("user_id", user.user.id)

        const currentCount = receipts?.length || 0

        // Check against plan limits
        const limitCheck = await checkPlanLimit("receipts", currentCount)

        setCanAddMore(limitCheck.allowed)
        setLimitMessage(limitCheck.message)
      } catch (error) {
        console.error("Error checking receipt limits:", error)
      }
    }

    checkReceiptLimits()
  }, [receipts, supabase])

  // Fetch receipts for the current business
  const fetchReceipts = async (businessId: string) => {
    if (!businessId) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("receipts")
        .select(`
          *,
          clients (
            id,
            name,
            email
          ),
          invoices (
            id,
            invoice_number
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setReceipts(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch receipts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = (receipt: Receipt) => {
    router.push(`/receipts/${receipt.id}/preview`)
  }

  const handleDelete = (receipt: Receipt) => {
    setReceiptToDelete(receipt)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!receiptToDelete) return

    try {
      setIsLoading(true)

      const { error } = await supabase.from("receipts").delete().eq("id", receiptToDelete.id)

      if (error) throw error

      toast({
        title: "Receipt deleted",
        description: "The receipt has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)

      // Refresh the receipts list
      if (selectedBusinessId) {
        fetchReceipts(selectedBusinessId)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receipt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "credit card":
        return "bg-blue-500"
      case "bank transfer":
        return "bg-green-500"
      case "cash":
        return "bg-yellow-500"
      case "paypal":
        return "bg-purple-500"
      case "check":
        return "bg-pink-500"
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading && receipts.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">Loading receipts...</h3>
        </div>
      </div>
    )
  }

  if (receipts.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No receipts</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You have not created any receipts yet. Add one below.
          </p>
          <Button onClick={() => document.getElementById("new-receipt-button")?.click()} disabled={!canAddMore}>
            Add Receipt
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
              <TableHead>Receipt #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                <TableCell>{receipt.clients.name}</TableCell>
                <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {receipt.invoices ? (
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => router.push(`/invoices/${receipt.invoices?.id}/preview`)}
                    >
                      {receipt.invoices.invoice_number}
                    </Button>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getPaymentMethodColor(receipt.payment_method)}>{receipt.payment_method}</Badge>
                </TableCell>
                <TableCell className="text-right">₦{Number(receipt.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(receipt)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/receipts/${receipt.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(receipt)}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete receipt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone.
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
