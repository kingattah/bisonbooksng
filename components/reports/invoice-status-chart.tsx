"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface InvoiceStatusChartProps {
  invoices: any[]
  isLoading: boolean
}

export function InvoiceStatusChart({ invoices, isLoading }: InvoiceStatusChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  // Define colors for the pie chart
  const COLORS = {
    paid: "#10b981", // green
    sent: "#3b82f6", // blue
    overdue: "#ef4444", // red
    draft: "#6b7280", // gray
  }

  useEffect(() => {
    // Create sample data if no invoices
    if (invoices.length === 0) {
      setChartData([{ name: "No Data", value: 100, color: "#6b7280" }])
      return
    }

    // Group invoices by status
    const statuses: Record<string, number> = {}

    for (const invoice of invoices) {
      const status = invoice.status || "draft"

      if (!statuses[status]) {
        statuses[status] = 0
      }

      statuses[status] += Number(invoice.total_amount)
    }

    // Convert to chart data format
    const data = Object.entries(statuses).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: COLORS[name as keyof typeof COLORS] || "#6b7280",
    }))

    setChartData(data)
  }, [invoices])

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `₦${value.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
