"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface RecentInvoicesProps {
  className?: string
}

type Invoice = {
  id: string
  invoice_number: string
  total_amount: number
  status: string
  issue_date: string
  client: {
    name: string
  }
}

export function RecentInvoices({ className }: RecentInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setIsLoading(true)
        const businessId = localStorage.getItem("selectedBusinessId")

        if (!businessId) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("invoices")
          .select(`
            id,
            invoice_number,
            total_amount,
            status,
            issue_date,
            clients (
              name
            )
          `)
          .eq("business_id", businessId)
          .order("issue_date", { ascending: false })
          .limit(5)

        if (error) throw error

        if (data) {
          setInvoices(
            data.map((invoice) => ({
              ...invoice,
              client: invoice.clients,
            })),
          )
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load recent invoices",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [supabase, toast])

  return (
    <Card
      className={cn(
        "col-span-4 overflow-hidden border-border/40 shadow-sm hover:shadow transition-all duration-200",
        className,
      )}
    >
      <CardHeader className="bg-muted/30">
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>Your most recent invoices</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices found</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center rounded-lg p-2 hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{invoice.client.name}</p>
                    <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
                  </div>
                  <div className="ml-auto font-medium">₦{Number(invoice.total_amount).toFixed(2)}</div>
                  <div className="ml-4">
                    <Badge
                      variant={
                        invoice.status === "paid" ? "default" : invoice.status === "overdue" ? "destructive" : "outline"
                      }
                      className="capitalize"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
