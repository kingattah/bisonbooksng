"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit, Download, Printer } from "lucide-react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface Receipt {
  id: string
  business_id: string
  client_id: string
  invoice_id: string | null
  receipt_number: string
  date: string
  amount: number
  payment_method: string
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
  invoices?: {
    id: string
    invoice_number: string
  } | null
}

interface ReceiptPreviewProps {
  receipt: Receipt
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
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
      if (receipt.businesses.logo_base64) {
        console.log(`Using logo_base64 from receipt data for business ${receipt.business_id}`)
        setBusinessLogo(receipt.businesses.logo_base64)
        return
      }

      if (receipt.businesses.logo_url) {
        console.log(`Using logo_url from receipt data for business ${receipt.business_id}`)
        setBusinessLogo(receipt.businesses.logo_url)
        return
      }

      // If not, fetch it from the database
      try {
        console.log(`Fetching logo for business ${receipt.business_id}`)
        const { data, error } = await supabase
          .from("businesses")
          .select("logo_base64")
          .eq("id", receipt.business_id)
          .single()

        if (error) {
          console.error("Error fetching business logo:", error)
          return
        }

        if (data && data.logo_base64) {
          console.log(`Found logo_base64 in database for business ${receipt.business_id}`)
          setBusinessLogo(data.logo_base64)
        } else {
          console.log(`No logo found for business ${receipt.business_id}`)
        }
      } catch (error) {
        console.error("Error fetching business logo:", error)
      }
    }

    fetchBusinessLogo()
  }, [receipt.business_id, receipt.businesses.logo_base64, receipt.businesses.logo_url, supabase])

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
    const printContent = document.getElementById("receipt-printable")

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
          <title>Receipt ${receipt.receipt_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 20px;
              border-radius: 5px;
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
            .receipt-details {
              margin-bottom: 30px;
            }
            .receipt-details table {
              width: 100%;
              border-collapse: collapse;
            }
            .receipt-details td {
              padding: 5px 0;
            }
            .receipt-details td:first-child {
              font-weight: bold;
              width: 150px;
            }
            .amount {
              font-size: 1.5em;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .notes {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .receipt-title {
              text-align: center;
              font-size: 1.5em;
              margin-bottom: 20px;
              color: #333;
            }
            .payment-method {
              display: inline-block;
              padding: 5px 10px;
              background-color: #f0f0f0;
              border-radius: 3px;
              font-weight: bold;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt-container {
                border: none;
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
          <div class="receipt-container">
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
      description: "Your receipt has been prepared for printing",
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
    router.push(`/receipts/${receipt.id}`)
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "credit card":
        return "bg-blue-500"
      case "bank transfer":
        return "bg-green-500"
      case "cash":
        return "bg-yellow-500"
      case "paypal":
        return "bg-purple-500"
      case "check":
        return "bg-pink-500"
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
        <Badge className={getPaymentMethodColor(receipt.payment_method)}>{receipt.payment_method.toUpperCase()}</Badge>
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
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="p-0">
          <div id="receipt-printable" ref={printRef} className="p-8">
            <div className="receipt-title">PAYMENT RECEIPT</div>

            {/* Receipt Header */}
            <div className="header flex justify-between items-start mb-8">
              <div className="business-info">
                {businessLogo ? (
                  <img
                    src={businessLogo || "/placeholder.svg"}
                    alt={receipt.businesses.name}
                    className="business-logo h-[60px] max-w-[200px] object-contain mb-2"
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <img
                      src="/images/bisonbookslogo.png"
                      alt="Bison Books"
                      className="h-[60px] w-auto object-contain"
                    />
                    <h1 className="text-xl font-bold">{receipt.businesses.name}</h1>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {receipt.businesses.address && <p>{receipt.businesses.address}</p>}
                  {receipt.businesses.email && <p>{receipt.businesses.email}</p>}
                  {receipt.businesses.phone && <p>{receipt.businesses.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">Receipt #{receipt.receipt_number}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(receipt.date)}</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="client-info mb-8">
              <h2 className="text-lg font-semibold mb-2">Received From:</h2>
              <div className="text-sm">
                <p className="font-medium">{receipt.clients.name}</p>
                {receipt.clients.address && <p>{receipt.clients.address}</p>}
                {receipt.clients.email && <p>{receipt.clients.email}</p>}
                {receipt.clients.phone && <p>{receipt.clients.phone}</p>}
              </div>
            </div>

            {/* Receipt Details */}
            <div className="receipt-details">
              <table>
                <tbody>
                  <tr>
                    <td>Receipt Number:</td>
                    <td>{receipt.receipt_number}</td>
                  </tr>
                  <tr>
                    <td>Payment Date:</td>
                    <td>{formatDate(receipt.date)}</td>
                  </tr>
                  {receipt.invoices && (
                    <tr>
                      <td>For Invoice:</td>
                      <td>{receipt.invoices.invoice_number}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Payment Method:</td>
                    <td>
                      <span className={`payment-method ${getPaymentMethodColor(receipt.payment_method)}`}>
                        {receipt.payment_method}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount */}
            <div className="amount">
              <div className="text-sm text-gray-600">Amount Received</div>
              <div className="text-3xl">₦{Number(receipt.amount).toFixed(2)}</div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="notes">
                <h2 className="text-lg font-semibold mb-2">Notes:</h2>
                <p className="text-sm whitespace-pre-line">{receipt.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
              <p>Thank you for your business!</p>
              <p>This is an official receipt for the payment received.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
