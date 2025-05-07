"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, Activity } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function DashboardCards() {
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalExpenses: 0,
    outstanding: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const businessId = localStorage.getItem("selectedBusinessId")

        if (!businessId) {
          setIsLoading(false)
          return
        }

        // Get total invoiced amount
        const { data: invoicesData, error: invoicesError } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("business_id", businessId)

        if (invoicesError) throw invoicesError

        // Get total expenses
        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("amount")
          .eq("business_id", businessId)

        if (expensesError) throw expensesError

        // Get outstanding invoices
        const { data: outstandingData, error: outstandingError } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("business_id", businessId)
          .in("status", ["sent", "overdue"])

        if (outstandingError) throw outstandingError

        const totalInvoiced = invoicesData?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0
        const totalExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0
        const outstanding = outstandingData?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0

        setStats({
          totalInvoiced,
          totalExpenses,
          outstanding,
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load dashboard stats",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [supabase, toast])

  if (isLoading) {
    return (
      <>
        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">Loading...</div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">Loading...</div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">Loading...</div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
          <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          <DollarSign className="h-4 w-4 text-primary/70" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">₦{stats.totalInvoiced.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-primary/70" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">₦{stats.totalExpenses.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <Activity className="h-4 w-4 text-primary/70" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">₦{stats.outstanding.toFixed(2)}</div>
        </CardContent>
      </Card>
    </>
  )
}
