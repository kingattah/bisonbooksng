import { Suspense } from "react"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { SearchBar } from "@/components/search/search-bar"

interface SearchResult {
  id: string
  type: "invoice" | "estimate" | "receipt" | "client" | "expense"
  title: string
  subtitle: string
  status?: string
  amount?: number
  date?: string
  url: string
}

async function getSearchResults(query: string, type: string) {
  const cookieStore = cookies()
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  let results: SearchResult[] = []
  const searchTerm = `%${query}%`

  switch (type) {
    case "invoices":
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, client_name, total_amount, status, created_at")
        .ilike("invoice_number", searchTerm)
        .or(`client_name.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
      
      results = (invoices || []).map((invoice: {
        id: string
        invoice_number: string
        client_name: string
        total_amount: number
        status: string
        created_at: string
      }) => ({
        id: invoice.id,
        type: "invoice",
        title: `Invoice #${invoice.invoice_number}`,
        subtitle: invoice.client_name,
        amount: invoice.total_amount,
        status: invoice.status,
        date: invoice.created_at,
        url: `/invoices/${invoice.id}`
      }))
      break

    case "estimates":
      const { data: estimates } = await supabase
        .from("estimates")
        .select("id, estimate_number, client_name, total_amount, status, created_at")
        .ilike("estimate_number", searchTerm)
        .or(`client_name.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
      
      results = (estimates || []).map((estimate: {
        id: string
        estimate_number: string
        client_name: string
        total_amount: number
        status: string
        created_at: string
      }) => ({
        id: estimate.id,
        type: "estimate",
        title: `Estimate #${estimate.estimate_number}`,
        subtitle: estimate.client_name,
        amount: estimate.total_amount,
        status: estimate.status,
        date: estimate.created_at,
        url: `/estimates/${estimate.id}`
      }))
      break

    case "receipts":
      const { data: receipts } = await supabase
        .from("receipts")
        .select("id, receipt_number, client_name, total_amount, created_at")
        .ilike("receipt_number", searchTerm)
        .or(`client_name.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
      
      results = (receipts || []).map((receipt: {
        id: string
        receipt_number: string
        client_name: string
        total_amount: number
        created_at: string
      }) => ({
        id: receipt.id,
        type: "receipt",
        title: `Receipt #${receipt.receipt_number}`,
        subtitle: receipt.client_name,
        amount: receipt.total_amount,
        date: receipt.created_at,
        url: `/receipts/${receipt.id}`
      }))
      break

    case "clients":
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, email, phone, created_at")
        .ilike("name", searchTerm)
        .or(`email.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
      
      results = (clients || []).map((client: {
        id: string
        name: string
        email: string | null
        phone: string | null
        created_at: string
      }) => ({
        id: client.id,
        type: "client",
        title: client.name,
        subtitle: client.email || client.phone || "",
        date: client.created_at,
        url: `/clients/${client.id}`
      }))
      break

    case "expenses":
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, description, amount, category, date")
        .ilike("description", searchTerm)
        .or(`category.ilike.${searchTerm}`)
        .order("date", { ascending: false })
      
      results = (expenses || []).map((expense: {
        id: string
        description: string
        amount: number
        category: string
        date: string
      }) => ({
        id: expense.id,
        type: "expense",
        title: expense.description,
        subtitle: expense.category,
        amount: expense.amount,
        date: expense.date,
        url: `/expenses/${expense.id}`
      }))
      break
  }

  return results
}

interface SearchContentProps {
  searchParams: {
    q?: string
    type?: string
  }
}

async function SearchContent({ searchParams }: SearchContentProps) {
  const query = searchParams.q
  const type = searchParams.type || "invoices"

  let results: SearchResult[] = []
  let error: string | undefined

  if (query) {
    try {
      results = await getSearchResults(query, type)
    } catch (e) {
      error = e instanceof Error ? e.message : "An error occurred while searching"
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : query ? (
        results.length > 0 ? (
          <div className="grid gap-4">
            {results.map((result) => (
              <a
                key={result.id}
                href={result.url}
                className="block p-4 rounded-lg border hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{result.title}</h3>
                    <p className="text-sm text-gray-500">{result.subtitle}</p>
                  </div>
                  <div className="text-right">
                    {result.amount !== undefined && (
                      <p className="font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(result.amount)}
                      </p>
                    )}
                    {result.status && (
                      <p className="text-sm text-gray-500">{result.status}</p>
                    )}
                    {result.date && (
                      <p className="text-sm text-gray-500">
                        {new Date(result.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p>No results found for "{query}"</p>
        )
      ) : (
        <p>Enter a search term to begin</p>
      )}
    </div>
  )
}

export default function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; type?: string }
}) {
  return (
    <div className="container py-8 space-y-6">
      <SearchBar />
      <Suspense fallback={<div>Loading...</div>}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
} 