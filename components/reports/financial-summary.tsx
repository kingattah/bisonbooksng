"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react"

interface FinancialSummaryProps {
  invoices: any[]
  expenses: any[]
  isLoading: boolean
}

export function FinancialSummary({ invoices, expenses, isLoading }: FinancialSummaryProps) {
  console.log("FinancialSummary - invoices:", invoices.length, "expenses:", expenses.length)

  // Calculate summary metrics
  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Count paid invoices
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid")
  const paidRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  // Count outstanding invoices
  const outstandingInvoices = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
  const outstandingRevenue = outstandingInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{invoices.length} invoices total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{totalExpenses.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{expenses.length} expenses recorded</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ₦{netProfit.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}% profit margin</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{outstandingRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{outstandingInvoices.length} unpaid invoices</p>
        </CardContent>
      </Card>
    </div>
  )
}
