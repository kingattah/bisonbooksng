"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface RecentExpensesProps {
  className?: string
}

type Expense = {
  id: string
  description: string
  amount: number
  date: string
  category: string
}

export function RecentExpenses({ className }: RecentExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true)
        const businessId = localStorage.getItem("selectedBusinessId")

        if (!businessId) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("business_id", businessId)
          .order("date", { ascending: false })
          .limit(5)

        if (error) throw error

        if (data) {
          setExpenses(data)
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load recent expenses",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchExpenses()
  }, [supabase, toast])

  return (
    <Card
      className={cn(
        "col-span-3 overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200",
        className,
      )}
    >
      <CardHeader className="bg-muted/30">
        <CardTitle>Recent Expenses</CardTitle>
        <CardDescription>Your most recent expenses</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground">Loading expenses...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses found</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="flex items-center rounded-lg p-2 hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category || "Uncategorized"}</p>
                  </div>
                  <div className="ml-auto font-medium">₦{Number(expense.amount).toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
