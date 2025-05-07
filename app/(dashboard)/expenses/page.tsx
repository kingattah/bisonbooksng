import type { Metadata } from "next"
import { createServerClient } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ExpenseCreateButton } from "@/components/expenses/expense-create-button"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { SearchBar } from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Expenses",
  description: "Manage your expenses",
}

export default async function ExpensesPage() {
  const supabase = createServerClient()

  // Get all expenses - the client component will filter them
  const { data: expenses } = await supabase.from("expenses").select("*").order("date", { ascending: false })

  return (
    <DashboardShell>
      <DashboardHeader heading="Expenses" text="Manage your expenses">
        <div className="flex items-center gap-4">
          <SearchBar placeholder="Search expenses..." />
          <ExpenseCreateButton />
        </div>
      </DashboardHeader>
      <ExpensesList expenses={expenses || []} />
    </DashboardShell>
  )
}
