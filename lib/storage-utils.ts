import { createClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

// Define the entity types for attachments
export type EntityType = "business" | "invoice" | "receipt" | "expense"

// Define the bucket names
const BUCKETS = {
  business: "business-logos",
  invoice: "invoice-attachments",
  receipt: "receipt-attachments",
  expense: "expense-receipts",
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(file: File, entityType: EntityType, entityId: string, businessId: string) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  // Generate a unique file name to avoid collisions
  const fileExt = file.name.split(".").pop()
  const fileName = `${uuidv4()}.${fileExt}`
  const filePath = `${user.id}/${businessId}/${entityId}/${fileName}`

  // Upload the file to the appropriate bucket
  const { data, error } = await supabase.storage.from(BUCKETS[entityType]).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) throw error

  // Get the public URL for the file
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKETS[entityType]).getPublicUrl(filePath)

  // Record the attachment in the database
  const { error: attachmentError } = await supabase.from("attachments").insert({
    user_id: user.id,
    business_id: businessId,
    entity_type: entityType,
    entity_id: entityId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: filePath,
  })

  if (attachmentError) throw attachmentError

  return {
    path: filePath,
    url: publicUrl,
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string, entityType: EntityType) {
  const supabase = createClient()

  // Delete the file from storage
  const { error } = await supabase.storage.from(BUCKETS[entityType]).remove([path])

  if (error) throw error

  // Delete the attachment record
  const { error: attachmentError } = await supabase.from("attachments").delete().eq("storage_path", path)

  if (attachmentError) throw attachmentError

  return true
}

/**
 * Get attachments for an entity
 */
export async function getAttachments(entityType: EntityType, entityId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)

  if (error) throw error

  // Add public URLs to the attachments
  return data.map((attachment) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKETS[entityType]).getPublicUrl(attachment.storage_path)

    return {
      ...attachment,
      url: publicUrl,
    }
  })
}
