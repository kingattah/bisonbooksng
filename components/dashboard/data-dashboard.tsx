"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export function DataDashboard() {
  const [activeTab, setActiveTab] = useState("business")
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)

  const supabase = useSupabaseClient()
  const { toast } = useToast()

  // Load businesses on component mount
  useEffect(() => {
    fetchBusinesses()

    // Get selected business from localStorage
    const storedBusinessId = localStorage.getItem("selectedBusinessId")
    if (storedBusinessId) {
      setSelectedBusinessId(storedBusinessId)
      fetchClients(storedBusinessId)
    }
  }, [])

  const fetchBusinesses = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("businesses").select("*").order("name")

      if (error) throw error

      setBusinesses(data || [])

      // If we have businesses but no selected business, select the first one
      if (data && data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(data[0].id)
        localStorage.setItem("selectedBusinessId", data[0].id)
        fetchClients(data[0].id)
      }
    } catch (error: any) {
      toast({
        title: "Error fetching businesses",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async (businessId: string) => {
    try {
      const { data, error } = await supabase.from("clients").select("*").eq("business_id", businessId).order("name")

      if (error) throw error

      setClients(data || [])
    } catch (error: any) {
      toast({
        title: "Error fetching clients",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const createBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const currency = (formData.get("currency") as string) || "USD"

    try {
      // The user_id will be set automatically by the trigger we created
      const { data, error } = await supabase
        .from("businesses")
        .insert({
          name,
          email,
          currency,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Business created",
        description: `${name} has been created successfully`,
      })

      // Reset the form
      e.currentTarget.reset()

      // Refresh businesses
      fetchBusinesses()
    } catch (error: any) {
      toast({
        title: "Error creating business",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedBusinessId) {
      toast({
        title: "No business selected",
        description: "Please create or select a business first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string

    try {
      // The user_id will be set automatically by the trigger we created
      const { data, error } = await supabase
        .from("clients")
        .insert({
          business_id: selectedBusinessId,
          name,
          email,
          phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Client created",
        description: `${name} has been created successfully`,
      })

      // Reset the form
      e.currentTarget.reset()

      // Refresh clients
      fetchClients(selectedBusinessId)
    } catch (error: any) {
      toast({
        title: "Error creating client",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedBusinessId) {
      toast({
        title: "No business selected",
        description: "Please create or select a business first",
        variant: "destructive",
      })
      return
    }

    if (clients.length === 0) {
      toast({
        title: "No clients available",
        description: "Please create a client first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get("client_id") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const description = formData.get("description") as string

    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const today = new Date().toISOString().split("T")[0]
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      // 1. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          business_id: selectedBusinessId,
          client_id: clientId,
          invoice_number: invoiceNumber,
          issue_date: today,
          due_date: dueDate.toISOString().split("T")[0],
          status: "draft",
          total_amount: amount,
          notes: "Created from quick form",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 2. Create an invoice item
      const { error: itemError } = await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        description: description,
        quantity: 1,
        unit_price: amount,
        amount: amount,
      })

      if (itemError) throw itemError

      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      })

      // Reset the form
      e.currentTarget.reset()
    } catch (error: any) {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedBusinessId) {
      toast({
        title: "No business selected",
        description: "Please create or select a business first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const description = formData.get("description") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const category = formData.get("category") as string

    try {
      // The user_id will be set automatically by the trigger we created
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          business_id: selectedBusinessId,
          description,
          amount,
          category,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Expense created",
        description: `Expense has been recorded successfully`,
      })

      // Reset the form
      e.currentTarget.reset()
    } catch (error: any) {
      toast({
        title: "Error creating expense",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId)
    localStorage.setItem("selectedBusinessId", businessId)
    fetchClients(businessId)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Data Management Dashboard</h1>

      {/* Business Selection */}
      {businesses.length > 0 && (
        <div className="mb-6">
          <Label>Selected Business</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {businesses.map((business) => (
              <Button
                key={business.id}
                variant={selectedBusinessId === business.id ? "default" : "outline"}
                onClick={() => selectBusiness(business.id)}
              >
                {business.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Create New Business</CardTitle>
              <CardDescription>
                Add a new business to your account. This will be used for invoices and expenses.
              </CardDescription>
            </CardHeader>
            <form onSubmit={createBusiness}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input id="name" name="name" placeholder="Acme Inc." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input id="email" name="email" type="email" placeholder="contact@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" placeholder="USD" defaultValue="USD" />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Business"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Client Tab */}
        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle>Create New Client</CardTitle>
              <CardDescription>Add a new client to your selected business.</CardDescription>
            </CardHeader>
            <form onSubmit={createClient}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input id="name" name="name" placeholder="John Doe or Company Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Client Email</Label>
                  <Input id="email" name="email" type="email" placeholder="client@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" placeholder="+1 (555) 123-4567" />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading || !selectedBusinessId}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Client"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Invoice Tab */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Create Quick Invoice</CardTitle>
              <CardDescription>Create a simple invoice with a single line item.</CardDescription>
            </CardHeader>
            <form onSubmit={createInvoice}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Select Client</Label>
                  <select
                    id="client_id"
                    name="client_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="Professional services" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="100.00" required />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading || !selectedBusinessId || clients.length === 0}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Invoice"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle>Record Expense</CardTitle>
              <CardDescription>Record a new expense for your selected business.</CardDescription>
            </CardHeader>
            <form onSubmit={createExpense}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="Office supplies" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="50.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="office">Office Supplies</option>
                    <option value="travel">Travel</option>
                    <option value="meals">Meals & Entertainment</option>
                    <option value="software">Software & Subscriptions</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading || !selectedBusinessId}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Record Expense"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
