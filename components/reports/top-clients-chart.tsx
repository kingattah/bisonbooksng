"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TopClientsChartProps {
  invoices: any[]
  isLoading: boolean
}

export function TopClientsChart({ invoices, isLoading }: TopClientsChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    // Create sample data if no invoices
    if (invoices.length === 0) {
      setChartData([{ name: "No Client Data", revenue: 0 }])
      return
    }

    // Group invoices by client
    const clients: Record<string, { name: string; total: number }> = {}

    for (const invoice of invoices) {
      if (!invoice.clients) continue

      const clientId = invoice.clients.id
      const clientName = invoice.clients.name

      if (!clients[clientId]) {
        clients[clientId] = { name: clientName, total: 0 }
      }

      clients[clientId].total += Number(invoice.total_amount)
    }

    // Convert to chart data format and sort
    const data = Object.values(clients)
      .map((client) => ({
        name: client.name,
        revenue: client.total,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5) // Top 5 clients

    setChartData(data)
  }, [invoices])

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(value) => `₦${value}`} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`₦${value}`, "Revenue"]}
            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc" }}
          />
          <Bar dataKey="revenue" fill="#8884d8" radius={[0, 4, 4, 0]} animationDuration={1000} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
