"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface RevenueChartProps {
  invoices: any[]
  period: string
  isLoading: boolean
}

export function RevenueChart({ invoices, period, isLoading }: RevenueChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    // Create some sample data if no invoices
    if (invoices.length === 0) {
      const sampleData = [
        { name: "Jan", revenue: 0 },
        { name: "Feb", revenue: 0 },
        { name: "Mar", revenue: 0 },
        { name: "Apr", revenue: 0 },
        { name: "May", revenue: 0 },
        { name: "Jun", revenue: 0 },
      ]
      setChartData(sampleData)
      return
    }

    // Simple data processing for actual invoices
    const data = []
    const months: Record<string, number> = {}

    // Group invoices by month
    for (const invoice of invoices) {
      const date = new Date(invoice.issue_date)
      const monthName = format(date, "MMM")

      if (!months[monthName]) {
        months[monthName] = 0
      }

      months[monthName] += Number(invoice.total_amount)
    }

    // Convert to chart data format
    for (const [month, revenue] of Object.entries(months)) {
      data.push({
        name: month,
        revenue: revenue,
      })
    }

    setChartData(data)
  }, [invoices])

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />
  }

  // Always render a chart, even with empty data
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value) => [`₦${value}`, "Revenue"]} />
        <Bar dataKey="revenue" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
