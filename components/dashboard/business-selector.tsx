"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"

type Business = {
  id: string
  name: string
}

export function BusinessSelector() {
  const [open, setOpen] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize Supabase client outside the try/catch to avoid conditional hook call
  const supabase = useSupabaseClient()

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!supabase) {
      setError("Failed to initialize database connection")
      return
    }

    const fetchBusinesses = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("businesses").select("id, name").order("name")

        if (error) {
          throw error
        }

        setBusinesses(data || [])

        // Get selected business from localStorage
        const selectedBusinessId = localStorage.getItem("selectedBusinessId")

        if (selectedBusinessId && data) {
          const business = data.find((b) => b.id === selectedBusinessId)
          if (business) {
            setSelectedBusiness(business)
          } else if (data.length > 0) {
            setSelectedBusiness(data[0])
            localStorage.setItem("selectedBusinessId", data[0].id)
          }
        } else if (data && data.length > 0) {
          setSelectedBusiness(data[0])
          localStorage.setItem("selectedBusinessId", data[0].id)
        }
      } catch (error: any) {
        setError(error.message || "Failed to load businesses")
        toast({
          title: "Error",
          description: error.message || "Failed to load businesses",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [supabase, toast])

  const selectBusiness = (business: Business) => {
    setSelectedBusiness(business)
    setOpen(false)

    // Save the selected business ID to localStorage
    localStorage.setItem("selectedBusinessId", business.id)

    // Refresh the page to apply the new business selection
    router.refresh()
  }

  if (error) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        Error: {error}
      </Button>
    )
  }

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        Loading...
      </Button>
    )
  }

  if (!selectedBusiness) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a business"
          className="w-[200px] justify-between"
        >
          {selectedBusiness.name}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search business..." />
            <CommandEmpty>No business found.</CommandEmpty>
            <CommandGroup heading="Businesses">
              {businesses.map((business) => (
                <CommandItem key={business.id} onSelect={() => selectBusiness(business)} className="text-sm">
                  {business.name}
                  <Check
                    className={cn("ml-auto h-4 w-4", selectedBusiness.id === business.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
