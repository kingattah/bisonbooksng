"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createReceipt(formData: FormData) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized")
    }

    // Extract form data
    const businessId = formData.get("business_id") as string
    const clientId = formData.get("client_id") as string
    const invoiceId = formData.get("invoice_id") as string
    const receiptNumber = formData.get("receipt_number") as string
    const date = formData.get("date") as string
    const amount = formData.get("amount") as string
    const paymentMethod = formData.get("payment_method") as string
    const notes = formData.get("notes") as string

    // Convert "no-invoice" to null
    const finalInvoiceId = invoiceId === "no-invoice" ? null : invoiceId

    // Create the receipt
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        business_id: businessId,
        client_id: clientId,
        invoice_id: finalInvoiceId,
        receipt_number: receiptNumber,
        date,
        amount: Number.parseFloat(amount),
        payment_method: paymentMethod,
        notes,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Receipt creation error:", error)
      throw new Error(error.message)
    }

    // If there's an invoice, update its status to "paid"
    if (finalInvoiceId) {
      const { error: updateError } = await supabase.from("invoices").update({ status: "paid" }).eq("id", finalInvoiceId)

      if (updateError) {
        console.error("Invoice update error:", updateError)
      }
    }

    revalidatePath("/receipts")
    return { success: true, data }
  } catch (error: any) {
    console.error("Server error:", error)
    return { success: false, error: error.message || "Failed to create receipt" }
  }
}
