"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { FileAttachments } from "@/components/ui/file-attachments"
import { uploadFile, getAttachments } from "@/lib/storage-utils"

interface Expense {
  id: string
  business_id: string
  description: string
  amount: number
  date: string
  category: string | null
  notes?: string | null
  receipt_url?: string | null
}

interface ExpenseEditFormProps {
  expense: Expense
}

export function ExpenseEditForm({ expense }: ExpenseEditFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense.receipt_url || null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchAttachments()
  }, [])

  const fetchAttachments = async () => {
    try {
      setIsLoadingAttachments(true)
      const data = await getAttachments("expense", expense.id)
      setAttachments(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load attachments",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAttachments(false)
    }
  }

  const handleReceiptUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, "expense", expense.id, expense.business_id)
      setReceiptUrl(result.url)

      // Update the expense with the new receipt URL
      const { error } = await supabase.from("expenses").update({ receipt_url: result.url }).eq("id", expense.id)

      if (error) throw error

      toast({
        title: "Receipt uploaded",
        description: "Your expense receipt has been uploaded successfully",
      })

      // Refresh attachments
      fetchAttachments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload receipt",
        variant: "destructive",
      })
    }
  }

  const handleAttachmentDelete = () => {
    // Refresh attachments after deletion
    fetchAttachments()
  }

  const updateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const description = formData.get("description") as string
    const amount = formData.get("amount") as string
    const date = formData.get("date") as string
    const category = formData.get("category") as string
    const notes = formData.get("notes") as string

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          description,
          amount: Number.parseFloat(amount),
          date,
          category,
          notes,
          receipt_url: receiptUrl,
        })
        .eq("id", expense.id)

      if (error) throw error

      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully",
      })

      router.push("/expenses")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={updateExpense} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={expense.description} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={expense.amount}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={expense.date} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" defaultValue={expense.category || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office Supplies</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="meals">Meals & Entertainment</SelectItem>
                <SelectItem value="software">Software & Subscriptions</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={expense.notes || ""} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt & Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receiptUrl && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Current Receipt</p>
              <img
                src={receiptUrl || "/placeholder.svg"}
                alt="Receipt"
                className="h-48 w-auto object-contain border rounded-md p-2"
              />
            </div>
          )}

          <FileUpload
            onUpload={handleReceiptUpload}
            accept="image/*,application/pdf"
            maxSize={5}
            buttonText="Upload Receipt"
          />

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Attachments</h3>
            {isLoadingAttachments ? (
              <p className="text-sm text-muted-foreground">Loading attachments...</p>
            ) : (
              <FileAttachments attachments={attachments} entityType="expense" onDelete={handleAttachmentDelete} />
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
