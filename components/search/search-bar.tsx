"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Trash } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSupabaseClient } from "@/components/supabase-provider"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SearchBarProps {
  placeholder?: string
}

interface SearchResult {
  id: string
  receipt_number?: string
  invoice_number?: string
  estimate_number?: string
  client_name?: string
  name?: string
  email?: string
  phone?: string
  total_amount?: number
  amount?: number
  status?: string
  date?: string
  payment_method?: string
  expiry_date?: string
  address?: string
  description?: string
  category?: string | null
  business_id?: string
}

export function SearchBar({ placeholder = "Search..." }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingClient, setEditingClient] = useState<SearchResult | null>(null)
  const [editingExpense, setEditingExpense] = useState<SearchResult | null>(null)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useSupabaseClient()
  const { toast } = useToast()
  const searchParams = new URLSearchParams(window.location.search)
  const currentQuery = searchParams.get("q") || ""

  useEffect(() => {
    setSearchQuery(currentQuery)
  }, [currentQuery])

  useEffect(() => {
    if (debouncedSearch !== currentQuery) {
      const params = new URLSearchParams(window.location.search)
      if (debouncedSearch) {
        params.set("q", debouncedSearch)
      } else {
        params.delete("q")
      }
      router.push(`${pathname}?${params.toString()}`)
    }
  }, [debouncedSearch, pathname, router, currentQuery])

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch) {
        setSearchResults([])
        return
      }

      try {
        setIsLoading(true)
        // Get the selected business ID from localStorage
        const businessId = localStorage.getItem("selectedBusinessId")
        if (!businessId) {
          toast({
            title: "Error",
            description: "No business selected. Please select a business first.",
            variant: "destructive",
          })
          return
        }

        // Determine if we're searching clients, estimates, receipts, invoices, or expenses based on the current path
        const isClientsPage = pathname.includes("/clients")
        const isEstimatesPage = pathname.includes("/estimates")
        const isReceiptsPage = pathname.includes("/receipts")
        const isExpensesPage = pathname.includes("/expenses")

        if (isExpensesPage) {
          // Search expenses
          const { data: results, error: searchError } = await supabase
            .from("expenses")
            .select(`
              id,
              description,
              amount,
              date,
              category,
              business_id
            `)
            .eq("business_id", businessId)
            .or(`description.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%`)
            .order("date", { ascending: false })
            .limit(5)

          if (searchError) {
            console.error("Search query error:", searchError)
            toast({
              title: "Error",
              description: "Failed to search expenses. Please try again.",
              variant: "destructive",
            })
            return
          }

          if (!results || results.length === 0) {
            setSearchResults([])
            return
          }

          const formattedResults = results.map((result: any) => ({
            id: result.id,
            description: result.description,
            amount: result.amount,
            date: result.date,
            category: result.category,
            business_id: result.business_id
          }))

          setSearchResults(formattedResults)
        } else if (isClientsPage) {
          // Search clients
          const { data: results, error: searchError } = await supabase
            .from("clients")
            .select(`
              id,
              name,
              email,
              phone,
              address
            `)
            .eq("business_id", businessId)
            .or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`)
            .order("name", { ascending: true })
            .limit(5)

          if (searchError) {
            console.error("Search query error:", searchError)
            toast({
              title: "Error",
              description: "Failed to search clients. Please try again.",
              variant: "destructive",
            })
            return
          }

          if (!results || results.length === 0) {
            setSearchResults([])
            return
          }

          const formattedResults = results.map((result: any) => ({
            id: result.id,
            name: result.name,
            email: result.email,
            phone: result.phone,
            address: result.address
          }))

          setSearchResults(formattedResults)
        } else if (isEstimatesPage) {
          // Search estimates
          const { data: results, error: searchError } = await supabase
            .from("estimates")
            .select(`
              id,
              estimate_number,
              total_amount,
              status,
              expiry_date,
              business_id,
              clients (
                name
              )
            `)
            .eq("business_id", businessId)
            .ilike("estimate_number", `%${debouncedSearch}%`)
            .order("created_at", { ascending: false })
            .limit(5)

          if (searchError) {
            console.error("Search query error:", searchError)
            toast({
              title: "Error",
              description: "Failed to search estimates. Please try again.",
              variant: "destructive",
            })
            return
          }

          if (!results || results.length === 0) {
            // Try searching by client name if no results found
            const { data: clientResults, error: clientError } = await supabase
              .from("estimates")
              .select(`
                id,
                estimate_number,
                total_amount,
                status,
                expiry_date,
                business_id,
                clients (
                  name
                )
              `)
              .eq("business_id", businessId)
              .ilike("clients.name", `%${debouncedSearch}%`)
              .order("created_at", { ascending: false })
              .limit(5)

            if (clientError) {
              console.error("Client search error:", clientError)
              return
            }

            if (clientResults && clientResults.length > 0) {
              const formattedResults = clientResults.map((result: any) => ({
                id: result.id,
                estimate_number: result.estimate_number || "No number",
                client_name: result.clients?.name || "No client",
                total_amount: result.total_amount || 0,
                status: result.status || "draft",
                expiry_date: result.expiry_date
              }))
              setSearchResults(formattedResults)
              return
            }

            setSearchResults([])
            return
          }

          const formattedResults = results.map((result: any) => ({
            id: result.id,
            estimate_number: result.estimate_number || "No number",
            client_name: result.clients?.name || "No client",
            total_amount: result.total_amount || 0,
            status: result.status || "draft",
            expiry_date: result.expiry_date
          }))

          setSearchResults(formattedResults)
        } else if (isReceiptsPage) {
          // Search receipts
          const { data: results, error: searchError } = await supabase
            .from("receipts")
            .select(`
              id,
              receipt_number,
              amount,
              date,
              payment_method,
              business_id,
              clients (
                name
              )
            `)
            .eq("business_id", businessId)
            .ilike("receipt_number", `%${debouncedSearch}%`)
            .order("created_at", { ascending: false })
            .limit(5)

          if (searchError) {
            console.error("Search query error:", searchError)
            toast({
              title: "Error",
              description: "Failed to search receipts. Please try again.",
              variant: "destructive",
            })
            return
          }

          if (!results || results.length === 0) {
            // Try searching by client name if no results found
            const { data: clientResults, error: clientError } = await supabase
              .from("receipts")
              .select(`
                id,
                receipt_number,
                amount,
                date,
                payment_method,
                business_id,
                clients (
                  name
                )
              `)
              .eq("business_id", businessId)
              .ilike("clients.name", `%${debouncedSearch}%`)
              .order("created_at", { ascending: false })
              .limit(5)

            if (clientError) {
              console.error("Client search error:", clientError)
              return
            }

            if (clientResults && clientResults.length > 0) {
              const formattedResults = clientResults.map((result: any) => ({
                id: result.id,
                receipt_number: result.receipt_number || "No number",
                client_name: result.clients?.name || "No client",
                amount: result.amount || 0,
                date: result.date,
                payment_method: result.payment_method
              }))
              setSearchResults(formattedResults)
              return
            }

            setSearchResults([])
            return
          }

          const formattedResults = results.map((result: any) => ({
            id: result.id,
            receipt_number: result.receipt_number || "No number",
            client_name: result.clients?.name || "No client",
            amount: result.amount || 0,
            date: result.date,
            payment_method: result.payment_method
          }))

          setSearchResults(formattedResults)
        } else {
          // Search invoices
          const { data: results, error: searchError } = await supabase
            .from("invoices")
            .select(`
              id,
              invoice_number,
              total_amount,
              status,
              business_id,
              clients (
                name
              )
            `)
            .eq("business_id", businessId)
            .ilike("invoice_number", `%${debouncedSearch}%`)
            .order("created_at", { ascending: false })
            .limit(5)

          if (searchError) {
            console.error("Search query error:", searchError)
            toast({
              title: "Error",
              description: "Failed to search invoices. Please try again.",
              variant: "destructive",
            })
            return
          }

          if (!results || results.length === 0) {
            // Try searching by client name if no results found
            const { data: clientResults, error: clientError } = await supabase
              .from("invoices")
              .select(`
                id,
                invoice_number,
                total_amount,
                status,
                business_id,
                clients (
                  name
                )
              `)
              .eq("business_id", businessId)
              .ilike("clients.name", `%${debouncedSearch}%`)
              .order("created_at", { ascending: false })
              .limit(5)

            if (clientError) {
              console.error("Client search error:", clientError)
              return
            }

            if (clientResults && clientResults.length > 0) {
              const formattedResults = clientResults.map((result: any) => ({
                id: result.id,
                invoice_number: result.invoice_number || "No number",
                client_name: result.clients?.name || "No client",
                total_amount: result.total_amount || 0,
                status: result.status || "draft"
              }))
              setSearchResults(formattedResults)
              return
            }

            setSearchResults([])
            return
          }

          const formattedResults = results.map((result: any) => ({
            id: result.id,
            invoice_number: result.invoice_number || "No number",
            client_name: result.clients?.name || "No client",
            total_amount: result.total_amount || 0,
            status: result.status || "draft"
          }))

          setSearchResults(formattedResults)
        }
      } catch (error) {
        console.error("Unexpected search error:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearch, supabase, toast, pathname])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    // Determine if we're on the clients, estimates, receipts, invoices, or expenses page
    const isClientsPage = pathname.includes("/clients")
    const isEstimatesPage = pathname.includes("/estimates")
    const isReceiptsPage = pathname.includes("/receipts")
    const isExpensesPage = pathname.includes("/expenses")
    
    if (isExpensesPage) {
      // Show the edit dialog for expenses
      setEditingExpense(result)
    } else if (isClientsPage) {
      // Show the edit dialog for clients
      setEditingClient(result)
    } else if (isEstimatesPage) {
      // Navigate to the estimate preview page
      router.push(`/estimates/${result.id}/preview`)
    } else if (isReceiptsPage) {
      // Navigate to the receipt preview page
      router.push(`/receipts/${result.id}/preview`)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="search"
              name="search"
              placeholder={placeholder}
              className="flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="button" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Searching...</div>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {searchResults.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex flex-col items-start py-2 cursor-pointer hover:bg-accent"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">
                            {result.estimate_number || result.invoice_number || result.receipt_number || result.name || result.description || "No name"}
                          </span>
                          <div className="flex items-center gap-2">
                            {(result.amount || result.total_amount) && (
                              <span className="text-sm text-muted-foreground">
                                ₦{(result.amount || result.total_amount || 0).toFixed(2)}
                              </span>
                            )}
                            {pathname.includes("/expenses") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm("Are you sure you want to delete this expense?")) {
                                    supabase
                                      .from("expenses")
                                      .delete()
                                      .eq("id", result.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to delete expense",
                                            variant: "destructive",
                                          })
                                        } else {
                                          toast({
                                            title: "Expense deleted",
                                            description: "The expense has been deleted successfully",
                                          })
                                          setSearchResults(searchResults.filter((r) => r.id !== result.id))
                                          router.refresh()
                                        }
                                      })
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                            {pathname.includes("/clients") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm("Are you sure you want to delete this client? This will also delete all associated invoices, estimates, and receipts.")) {
                                    supabase
                                      .from("clients")
                                      .delete()
                                      .eq("id", result.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to delete client",
                                            variant: "destructive",
                                          })
                                        } else {
                                          toast({
                                            title: "Client deleted",
                                            description: "The client has been deleted successfully",
                                          })
                                          setSearchResults(searchResults.filter((r) => r.id !== result.id))
                                          router.refresh()
                                        }
                                      })
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-muted-foreground">
                            {result.client_name || result.name || ""}
                          </span>
                          <div className="flex items-center gap-2">
                            {result.status && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                result.status === 'paid' ? 'bg-green-100 text-green-800' :
                                result.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                result.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                result.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                result.status === 'declined' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {result.status}
                              </span>
                            )}
                            {result.expiry_date && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                Expires: {new Date(result.expiry_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {editingClient && (
        <Dialog open={true} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="sm:max-width-md">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Make changes to your client here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!editingClient) return

              const formData = new FormData(e.currentTarget)
              const name = formData.get("name") as string
              const email = formData.get("email") as string
              const phone = formData.get("phone") as string
              const address = formData.get("address") as string

              try {
                const { error } = await supabase
                  .from("clients")
                  .update({
                    name,
                    email,
                    phone,
                    address,
                  })
                  .eq("id", editingClient.id)

                if (error) {
                  throw error
                }

                toast({
                  title: "Client updated",
                  description: "The client has been updated successfully",
                })

                setEditingClient(null)
                router.refresh()
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update client",
                  variant: "destructive",
                })
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Client name</Label>
                  <Input id="name" name="name" defaultValue={editingClient.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingClient.email || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editingClient.phone || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={editingClient.address || ""} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editingExpense && (
        <Dialog open={true} onOpenChange={() => setEditingExpense(null)}>
          <DialogContent className="sm:max-width-md">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Make changes to your expense here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!editingExpense) return

              const formData = new FormData(e.currentTarget)
              const description = formData.get("description") as string
              const amount = parseFloat(formData.get("amount") as string)
              const category = formData.get("category") as string
              const date = formData.get("date") as string

              try {
                const { error } = await supabase
                  .from("expenses")
                  .update({
                    description,
                    amount,
                    category,
                    date,
                  })
                  .eq("id", editingExpense.id)

                if (error) {
                  throw error
                }

                toast({
                  title: "Expense updated",
                  description: "The expense has been updated successfully",
                })

                setEditingExpense(null)
                router.refresh()
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update expense",
                  variant: "destructive",
                })
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    defaultValue={editingExpense.description} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingExpense.amount} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input 
                    id="category" 
                    name="category" 
                    defaultValue={editingExpense.category || ""} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    name="date" 
                    type="date" 
                    defaultValue={editingExpense.date ? new Date(editingExpense.date).toISOString().split('T')[0] : ""} 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}