"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface ExpensesChartProps {
  expenses: any[]
  isLoading: boolean
}

export function ExpensesChart({ expenses, isLoading }: ExpensesChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  useEffect(() => {
    // Create sample data if no expenses
    if (expenses.length === 0) {
      setChartData([{ name: "No Data", value: 100 }])
      return
    }

    // Group expenses by category
    const categories: Record<string, number> = {}

    for (const expense of expenses) {
      const category = expense.category || "Uncategorized"

      if (!categories[category]) {
        categories[category] = 0
      }

      categories[category] += Number(expense.amount)
    }

    // Convert to chart data format
    const data = Object.entries(categories).map(([name, value]) => ({
      name: getCategoryLabel(name),
      value,
    }))

    setChartData(data)
  }, [expenses])

  const getCategoryLabel = (category: string) => {
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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `₦${value.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
