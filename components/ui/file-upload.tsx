"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileText, Image, File } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSize?: number // in MB
  className?: string
  buttonText?: string
}

export function FileUpload({
  onUpload,
  accept = "image/*,application/pdf",
  maxSize = 5, // 5MB default
  className,
  buttonText = "Upload File",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Reset error state
    setError(null)

    // Check file type
    if (
      accept !== "*" &&
      !accept.split(",").some((type) => {
        if (type.includes("*")) {
          const mainType = type.split("/")[0]
          return file.type.startsWith(mainType)
        }
        return file.type === type
      })
    ) {
      setError(`Invalid file type. Accepted types: ${accept}`)
      return
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size: ${maxSize}MB`)
      return
    }

    try {
      setIsUploading(true)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 10
          return next > 90 ? 90 : next
        })
      }, 300)

      await onUpload(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Reset after a short delay
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 1000)
    } catch (err: any) {
      setError(err.message || "Upload failed")
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-6 w-6" />
    if (fileType.includes("pdf")) return <FileText className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-70",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{buttonText}</p>
          <p className="text-xs text-muted-foreground">Drag and drop or click to upload</p>
          <p className="text-xs text-muted-foreground">Max size: {maxSize}MB</p>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2 w-full" />
          <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
