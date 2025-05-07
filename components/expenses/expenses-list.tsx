"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, MoreHorizontal, Trash } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  category: string | null
  business_id: string
}

interface ExpensesListProps {
  expenses: Expense[] // This will be the initial expenses
}

export function ExpensesList({ expenses: initialExpenses }: ExpensesListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Filter expenses based on the selected business ID
  useEffect(() => {
    const selectedBusinessId = localStorage.getItem("selectedBusinessId")
    if (selectedBusinessId) {
      const filteredExpenses = initialExpenses.filter((expense) => expense.business_id === selectedBusinessId)
      setExpenses(filteredExpenses)
    } else {
      setExpenses(initialExpenses)
    }
  }, [initialExpenses])

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
  }

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!expenseToDelete) return

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseToDelete.id)

      if (error) {
        throw error
      }

      // Update the local state
      setExpenses(expenses.filter((expense) => expense.id !== expenseToDelete.id))

      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      })
    }
  }

  const updateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!editingExpense) return

    const formData = new FormData(e.currentTarget)
    const description = formData.get("description") as string
    const amount = formData.get("amount") as string
    const date = formData.get("date") as string
    const category = formData.get("category") as string

    try {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          description,
          amount: Number.parseFloat(amount),
          date,
          category,
        })
        .eq("id", editingExpense.id)
        .select()

      if (error) {
        throw error
      }

      // Update the local state
      if (data && data.length > 0) {
        setExpenses(
          expenses.map((expense) =>
            expense.id === editingExpense.id
              ? {
                  ...expense,
                  description,
                  amount: Number.parseFloat(amount),
                  date,
                  category,
                }
              : expense,
          ),
        )
      }

      toast({
        title: "Expense updated",
        description: "The expense has been updated successfully",
      })

      setEditingExpense(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      })
    }
  }

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case "office":
        return "Office Supplies"
      case "travel":
        return "Travel"
      case "meals":
        return "Meals & Entertainment"
      case "software":
        return "Software & Subscriptions"
      case "marketing":
        return "Marketing"
      case "other":
        return "Other"
      default:
        return "Uncategorized"
    }
  }

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "office":
        return "bg-blue-500"
      case "travel":
        return "bg-green-500"
      case "meals":
        return "bg-yellow-500"
      case "software":
        return "bg-purple-500"
      case "marketing":
        return "bg-pink-500"
      case "other":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No expenses</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You have not created any expenses yet. Add one below.
          </p>
          <Button onClick={() => document.getElementById("new-expense-button")?.click()}>Add Expense</Button>
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
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell>
                  <Badge className={getCategoryColor(expense.category)}>{getCategoryLabel(expense.category)}</Badge>
                </TableCell>
                <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">₦{Number(expense.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(expense)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(expense)}>
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

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>Make changes to your expense here.</DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={updateExpense}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" defaultValue={editingExpense.description} required />
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
                      defaultValue={editingExpense.amount}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" defaultValue={editingExpense.date} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={editingExpense.category || undefined}>
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
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
