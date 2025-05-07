"use client"

import { useState } from "react"
import { FileText, Image, File, Trash2, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { deleteFile } from "@/lib/storage-utils"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Attachment {
  id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  url: string
  created_at: string
}

interface FileAttachmentsProps {
  attachments: Attachment[]
  entityType: "business" | "invoice" | "receipt" | "expense"
  onDelete?: (attachmentId: string) => void
  readOnly?: boolean
}

export function FileAttachments({ attachments, entityType, onDelete, readOnly = false }: FileAttachmentsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!selectedAttachment) return

    try {
      setIsDeleting(selectedAttachment.id)
      await deleteFile(selectedAttachment.storage_path, entityType)

      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
      })

      onDelete?.(selectedAttachment.id)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
      setDeleteDialogOpen(false)
    }
  }

  const confirmDelete = (attachment: Attachment) => {
    setSelectedAttachment(attachment)
    setDeleteDialogOpen(true)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-6 w-6" />
    if (fileType.includes("pdf")) return <FileText className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments</p>
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <Card key={attachment.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">{getFileIcon(attachment.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)} • {formatDate(attachment.created_at)}
                </p>
              </div>
              <div className="flex-shrink-0 flex gap-1">
                {attachment.file_type.startsWith("image/") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(attachment.url, "_blank")}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(attachment.url, "_blank")}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(attachment)}
                    disabled={isDeleting === attachment.id}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
