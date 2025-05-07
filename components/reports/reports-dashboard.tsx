"use client"

import { useState, useEffect } from "react"
// Add this line at the top of the file, right after the imports
// console.log('Recharts version:', require('recharts/package.json').version);
import { useSupabaseClient } from "@/components/supabase-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { RevenueChart } from "./revenue-chart"
import { ExpensesChart } from "./expenses-chart"
import { InvoiceStatusChart } from "./invoice-status-chart"
import { TopClientsChart } from "./top-clients-chart"
import { FinancialSummary } from "./financial-summary"
import { useLoading } from "@/components/loading/loading-context"

interface Business {
  id: string
  name: string
}

interface ReportsDashboardProps {
  businesses: Business[]
}

export function ReportsDashboard({ businesses }: ReportsDashboardProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("year")
  const [isLoading, setIsLoading] = useState(true)
  const [invoicesData, setInvoicesData] = useState<any[]>([])
  const [expensesData, setExpensesData] = useState<any[]>([])
  const supabase = useSupabaseClient()
  const { toast } = useToast()
  const { setLoading } = useLoading()

  // Initialize selected business from localStorage
  useEffect(() => {
    const storedBusinessId = localStorage.getItem("selectedBusinessId")
    if (storedBusinessId) {
      setSelectedBusinessId(storedBusinessId)
    } else if (businesses.length > 0) {
      setSelectedBusinessId(businesses[0].id)
      localStorage.setItem("selectedBusinessId", businesses[0].id)
    }
  }, [businesses])

  // Fetch data when business or period changes
  useEffect(() => {
    if (selectedBusinessId) {
      fetchReportsData(selectedBusinessId, selectedPeriod)
    }
  }, [selectedBusinessId, selectedPeriod, supabase])

  // In the fetchReportsData function, add these console logs:
  const fetchReportsData = async (businessId: string, period: string) => {
    setIsLoading(true)
    // Show global loading screen for report generation
    setLoading(true, "Generating financial reports...", "report-generation")

    try {
      console.log(`Fetching data for business: ${businessId}, period: ${period}`)

      // Calculate date range based on selected period
      const endDate = new Date()
      const startDate = new Date()

      if (period === "month") {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (period === "quarter") {
        startDate.setMonth(startDate.getMonth() - 3)
      } else if (period === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      // Format dates for Supabase query
      const startDateStr = startDate.toISOString().split("T")[0]
      const endDateStr = endDate.toISOString().split("T")[0]

      console.log(`Date range: ${startDateStr} to ${endDateStr}`)

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          status,
          total_amount,
          clients (
            id,
            name
          )
        `)
        .eq("business_id", businessId)
        .gte("issue_date", startDateStr)
        .lte("issue_date", endDateStr)
        .order("issue_date", { ascending: true })

      if (invoicesError) throw invoicesError
      console.log(`Fetched ${invoices?.length || 0} invoices`)
      setInvoicesData(invoices || [])

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("business_id", businessId)
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true })

      if (expensesError) throw expensesError
      console.log(`Fetched ${expenses?.length || 0} expenses`)
      setExpensesData(expenses || [])
    } catch (error: any) {
      console.error("Error fetching report data:", error)
      toast({
        title: "Error loading reports",
        description: error.message || "Failed to load report data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      // Hide global loading screen
      setLoading(false)
    }
  }

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId)
    localStorage.setItem("selectedBusinessId", businessId)
  }

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  // Find the selected business name
  const selectedBusinessName = businesses.find((b) => b.id === selectedBusinessId)?.name || "All Businesses"

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="w-full md:w-1/2 space-y-2">
          <Label htmlFor="business-select">Business</Label>
          <Select value={selectedBusinessId || ""} onValueChange={handleBusinessChange}>
            <SelectTrigger id="business-select">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-1/2 space-y-2">
          <Label htmlFor="period-select">Time Period</Label>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger id="period-select">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <FinancialSummary invoices={invoicesData} expenses={expensesData} isLoading={isLoading} />

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="revenue" className="px-4 py-2">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="expenses" className="px-4 py-2">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="invoice-status" className="px-4 py-2">
            Invoice Status
          </TabsTrigger>
          <TabsTrigger value="top-clients" className="px-4 py-2">
            Top Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Revenue trends for {selectedBusinessName} over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart invoices={invoicesData} period={selectedPeriod} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses By Category</CardTitle>
              <CardDescription>Expense breakdown for {selectedBusinessName} over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpensesChart expenses={expensesData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-status">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
              <CardDescription>Status of invoices for {selectedBusinessName} over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceStatusChart invoices={invoicesData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-clients">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
              <CardDescription>Highest revenue-generating clients for {selectedBusinessName}</CardDescription>
            </CardHeader>
            <CardContent>
              <TopClientsChart invoices={invoicesData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
