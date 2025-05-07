"use client"

import { useState, useEffect } from "react"
import { useSupabaseClient } from "@/components/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { FileAttachments } from "@/components/ui/file-attachments"
import { uploadFile, getAttachments } from "@/lib/storage-utils"

interface InvoiceAttachmentsProps {
  invoiceId: string
  businessId: string
}

export function InvoiceAttachments({ invoiceId, businessId }: InvoiceAttachmentsProps) {
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchAttachments()
  }, [])

  const fetchAttachments = async () => {
    try {
      setIsLoading(true)
      const data = await getAttachments("invoice", invoiceId)
      setAttachments(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load attachments",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      await uploadFile(file, "invoice", invoiceId, businessId)

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully",
      })

      // Refresh attachments
      fetchAttachments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const handleAttachmentDelete = () => {
    // Refresh attachments after deletion
    fetchAttachments()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          onUpload={handleFileUpload}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          maxSize={10}
          buttonText="Upload Attachment"
        />

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Attachments</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading attachments...</p>
          ) : (
            <FileAttachments attachments={attachments} entityType="invoice" onDelete={handleAttachmentDelete} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
