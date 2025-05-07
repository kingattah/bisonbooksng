"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, Download, Send, Printer, FileText } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EstimateItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Estimate {
  id: string
  business_id: string
  client_id: string
  estimate_number: string
  issue_date: string
  expiry_date: string
  status: string
  total_amount: number
  notes?: string
  clients: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
  businesses: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    logo_url?: string
    logo_base64?: string
  }
}

interface EstimatePreviewProps {
  estimate: Estimate
  estimateItems: EstimateItem[]
}

export function EstimatePreview({ estimate, estimateItems }: EstimatePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [businessLogo, setBusinessLogo] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Fetch business logo if not already included
  useEffect(() => {
    const fetchBusinessLogo = async () => {
      // Reset the logo when the business changes
      setBusinessLogo(null)

      // Check if we already have the logo
      if (estimate.businesses.logo_base64) {
        console.log(`Using logo_base64 from estimate data for business ${estimate.business_id}`)
        setBusinessLogo(estimate.businesses.logo_base64)
        return
      }

      if (estimate.businesses.logo_url) {
        console.log(`Using logo_url from estimate data for business ${estimate.business_id}`)
        setBusinessLogo(estimate.businesses.logo_url)
        return
      }

      // If not, fetch it from the database
      try {
        console.log(`Fetching logo for business ${estimate.business_id}`)
        const { data, error } = await supabase
          .from("businesses")
          .select("logo_base64")
          .eq("id", estimate.business_id)
          .single()

        if (error) {
          console.error("Error fetching business logo:", error)
          return
        }

        if (data && data.logo_base64) {
          console.log(`Found logo_base64 in database for business ${estimate.business_id}`)
          setBusinessLogo(data.logo_base64)
        } else {
          console.log(`No logo found for business ${estimate.business_id}`)
        }
      } catch (error) {
        console.error("Error fetching business logo:", error)
      }
    }

    fetchBusinessLogo()
  }, [estimate.business_id, estimate.businesses.logo_base64, estimate.businesses.logo_url, supabase])

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank")

    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup blocker settings.",
        variant: "destructive",
      })
      return
    }

    // Get the printable content
    const printContent = document.getElementById("estimate-printable")

    if (!printContent) {
      toast({
        title: "Error",
        description: "Could not find printable content.",
        variant: "destructive",
      })
      return
    }

    // Write the HTML to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Estimate ${estimate.estimate_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .estimate-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .business-info {
              margin-bottom: 20px;
            }
            .business-logo {
              height: 60px;
              max-width: 200px;
              object-fit: contain;
              margin-bottom: 10px;
            }
            .client-info {
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .text-right {
              text-align: right;
            }
            .total-row {
              font-weight: bold;
            }
            .notes {
              margin-bottom: 30px;
            }
            .estimate-label {
              font-size: 1.5em;
              color: #666;
              margin-bottom: 10px;
            }
            .validity {
              margin-top: 30px;
              font-size: 0.9em;
              color: #666;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .business-logo {
                height: 60px !important;
                max-width: 200px !important;
                object-fit: contain !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="estimate-container">
            ${printContent.innerHTML}
          </div>
          <script>
            // Auto print when loaded
            window.onload = function() {
              window.print();
              // Close the window after printing (optional)
              // setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()

    toast({
      title: "Print prepared",
      description: "Your estimate has been prepared for printing",
    })
  }

  const handleDownload = () => {
    // For download, we'll use the same print window but suggest saving as PDF
    handlePrint()

    toast({
      title: "Download prepared",
      description: "To save as PDF, select 'Save as PDF' in the print dialog",
    })
  }

  const handleEdit = () => {
    router.push(`/estimates/${estimate.id}`)
  }

  const handleSend = async () => {
    setIsLoading(true)

    try {
      // Update estimate status to "sent"
      const { error } = await supabase.from("estimates").update({ status: "sent" }).eq("id", estimate.id)

      if (error) throw error

      toast({
        title: "Estimate sent",
        description: "The estimate status has been updated to 'sent'",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const convertToInvoice = async () => {
    setIsLoading(true)

    try {
      // 1. Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

      // 2. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          business_id: estimate.business_id,
          client_id: estimate.client_id,
          invoice_number: invoiceNumber,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "draft",
          total_amount: estimate.total_amount,
          notes: `Converted from estimate #${estimate.estimate_number}`,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 3. Create invoice items
      const invoiceItems = estimateItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }))

      const { error: createItemsError } = await supabase.from("invoice_items").insert(invoiceItems)

      if (createItemsError) throw createItemsError

      // 4. Update estimate status to "converted"
      const { error: updateError } = await supabase
        .from("estimates")
        .update({ status: "converted" })
        .eq("id", estimate.id)

      if (updateError) throw updateError

      toast({
        title: "Estimate converted",
        description: "The estimate has been converted to an invoice successfully",
      })

      setIsConvertDialogOpen(false)

      // Redirect to the new invoice
      router.push(`/invoices/${invoice.id}/preview`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert estimate to invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500"
      case "sent":
        return "bg-blue-500"
      case "rejected":
        return "bg-red-500"
      case "converted":
        return "bg-purple-500"
      case "draft":
      default:
        return "bg-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP")
    } catch (error) {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Badge className={getStatusColor(estimate.status)}>{estimate.status.toUpperCase()}</Badge>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {estimate.status === "draft" && (
            <Button onClick={handleSend} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              {isLoading ? "Sending..." : "Mark as Sent"}
            </Button>
          )}
          {(estimate.status === "draft" || estimate.status === "sent" || estimate.status === "accepted") && (
            <Button onClick={() => setIsConvertDialogOpen(true)} disabled={isLoading}>
              <FileText className="mr-2 h-4 w-4" />
              Convert to Invoice
            </Button>
          )}
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="p-0">
          <div id="estimate-printable" ref={printRef} className="p-8">
            {/* Estimate Header */}
            <div className="header flex justify-between items-start mb-8">
              <div className="business-info">
                {businessLogo ? (
                  <img
                    src={businessLogo || "/placeholder.svg"}
                    alt={estimate.businesses.name}
                    className="business-logo h-[60px] max-w-[200px] object-contain mb-2"
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <img
                      src="/images/bisonbookslogo.png"
                      alt="Bison Books"
                      className="h-[60px] w-auto object-contain"
                    />
                    <h1 className="text-xl font-bold">{estimate.businesses.name}</h1>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {estimate.businesses.address && <p>{estimate.businesses.address}</p>}
                  {estimate.businesses.email && <p>{estimate.businesses.email}</p>}
                  {estimate.businesses.phone && <p>{estimate.businesses.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold mb-2">ESTIMATE</h1>
                <p className="text-lg font-semibold">#{estimate.estimate_number}</p>
                <p className="text-sm text-gray-600">Issue Date: {formatDate(estimate.issue_date)}</p>
                <p className="text-sm text-gray-600">Valid Until: {formatDate(estimate.expiry_date)}</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="client-info mb-8">
              <h2 className="text-lg font-semibold mb-2">Prepared For:</h2>
              <div className="text-sm">
                <p className="font-medium">{estimate.clients.name}</p>
                {estimate.clients.address && <p>{estimate.clients.address}</p>}
                {estimate.clients.email && <p>{estimate.clients.email}</p>}
                {estimate.clients.phone && <p>{estimate.clients.phone}</p>}
              </div>
            </div>

            {/* Estimate Items */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left border">Description</th>
                    <th className="py-2 px-4 text-right border">Quantity</th>
                    <th className="py-2 px-4 text-right border">Unit Price</th>
                    <th className="py-2 px-4 text-right border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {estimateItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-4 text-left border">{item.description}</td>
                      <td className="py-2 px-4 text-right border">{item.quantity}</td>
                      <td className="py-2 px-4 text-right border">₦{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right border">₦{Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={3} className="py-2 px-4 text-right font-semibold">
                      Total:
                    </td>
                    <td className="py-2 px-4 text-right font-bold border">
                      ₦{Number(estimate.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {estimate.notes && (
              <div className="notes mb-8">
                <h2 className="text-lg font-semibold mb-2">Notes:</h2>
                <p className="text-sm whitespace-pre-line">{estimate.notes}</p>
              </div>
            )}

            {/* Validity */}
            <div className="validity text-sm text-gray-600">
              <p>This estimate is valid until {formatDate(estimate.expiry_date)}.</p>
              <p>Thank you for your business!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convert to Invoice Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to convert this estimate to an invoice? This will create a new invoice with the same
              items and mark this estimate as converted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={convertToInvoice} disabled={isLoading}>
              {isLoading ? "Converting..." : "Convert to Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
