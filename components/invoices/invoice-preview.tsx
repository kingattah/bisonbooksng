"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, Download, Send, Printer } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Invoice {
  id: string
  business_id: string
  client_id: string
  invoice_number: string
  issue_date: string
  due_date: string
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

interface InvoicePreviewProps {
  invoice: Invoice
  invoiceItems: InvoiceItem[]
}

export function InvoicePreview({ invoice, invoiceItems }: InvoicePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [businessLogo, setBusinessLogo] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  // Fetch the business logo if not included in the invoice data
  useEffect(() => {
    const fetchBusinessLogo = async () => {
      // Reset the logo when the business changes
      setBusinessLogo(null)

      // Check if we already have the logo
      if (invoice.businesses.logo_base64) {
        console.log(`Using logo_base64 from invoice data for business ${invoice.business_id}`)
        setBusinessLogo(invoice.businesses.logo_base64)
        return
      }

      if (invoice.businesses.logo_url) {
        console.log(`Using logo_url from invoice data for business ${invoice.business_id}`)
        setBusinessLogo(invoice.businesses.logo_url)
        return
      }

      // If not, fetch it from the database
      try {
        console.log(`Fetching logo for business ${invoice.business_id}`)
        const { data, error } = await supabase
          .from("businesses")
          .select("logo_base64")
          .eq("id", invoice.business_id)
          .single()

        if (error) {
          console.error("Error fetching business logo:", error)
          return
        }

        if (data && data.logo_base64) {
          console.log(`Found logo_base64 in database for business ${invoice.business_id}`)
          setBusinessLogo(data.logo_base64)
        } else {
          console.log(`No logo found for business ${invoice.business_id}`)
        }
      } catch (error) {
        console.error("Error fetching business logo:", error)
      }
    }

    fetchBusinessLogo()
  }, [invoice.business_id, invoice.businesses.logo_base64, invoice.businesses.logo_url, supabase])

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
    const printContent = document.getElementById("invoice-printable")

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
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .invoice-container {
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
              width: auto;
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
            .payment-terms {
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
                width: auto !important;
                max-width: 200px !important;
                object-fit: contain !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
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
      description: "Your invoice has been prepared for printing",
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
    router.push(`/invoices/${invoice.id}`)
  }

  const handleSend = async () => {
    setIsLoading(true)

    try {
      // Update invoice status to "sent"
      const { error } = await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id)

      if (error) throw error

      toast({
        title: "Invoice sent",
        description: "The invoice status has been updated to 'sent'",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500"
      case "sent":
        return "bg-blue-500"
      case "overdue":
        return "bg-red-500"
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
        <Badge className={getStatusColor(invoice.status)}>{invoice.status.toUpperCase()}</Badge>
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
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              {isLoading ? "Sending..." : "Mark as Sent"}
            </Button>
          )}
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="p-0">
          <div id="invoice-printable" ref={printRef} className="p-8">
            {/* Invoice Header */}
            <div className="header flex justify-between items-start mb-8">
              <div className="business-info">
                {businessLogo ? (
                  <img
                    src={businessLogo || "/placeholder.svg"}
                    alt={invoice.businesses.name}
                    className="business-logo h-[60px] w-auto max-w-[200px] object-contain mb-2"
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <img
                      src="/images/bisonbookslogo.png"
                      alt="Bison Books"
                      className="h-[60px] w-auto object-contain"
                    />
                    <h1 className="text-xl font-bold">{invoice.businesses.name}</h1>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {invoice.businesses.address && <p>{invoice.businesses.address}</p>}
                  {invoice.businesses.email && <p>{invoice.businesses.email}</p>}
                  {invoice.businesses.phone && <p>{invoice.businesses.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
                <p className="text-lg font-semibold">#{invoice.invoice_number}</p>
                <p className="text-sm text-gray-600">Issue Date: {formatDate(invoice.issue_date)}</p>
                <p className="text-sm text-gray-600">Due Date: {formatDate(invoice.due_date)}</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="client-info mb-8">
              <h2 className="text-lg font-semibold mb-2">Bill To:</h2>
              <div className="text-sm">
                <p className="font-medium">{invoice.clients.name}</p>
                {invoice.clients.address && <p>{invoice.clients.address}</p>}
                {invoice.clients.email && <p>{invoice.clients.email}</p>}
                {invoice.clients.phone && <p>{invoice.clients.phone}</p>}
              </div>
            </div>

            {/* Invoice Items */}
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
                  {invoiceItems.map((item) => (
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
                      ₦{Number(invoice.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="notes mb-8">
                <h2 className="text-lg font-semibold mb-2">Notes:</h2>
                <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Terms */}
            <div className="payment-terms text-sm text-gray-600">
              <h2 className="text-lg font-semibold mb-2">Payment Terms:</h2>
              <p>
                Please pay within{" "}
                {Math.ceil(
                  (new Date(invoice.due_date).getTime() - new Date(invoice.issue_date).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days of issue.
              </p>
              <p>Thank you for your business!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
