import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { checkPlanLimit } from "@/lib/subscription-limits"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check receipt limits before creating
    const { data: receipts } = await supabase.from("receipts").select("id").eq("user_id", user.id)
    const receiptCount = receipts?.length || 0

    // Check against plan limits
    const limitCheck = await checkPlanLimit("receipts", receiptCount)

    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 })
    }

    const body = await request.json()

    // Convert "no-invoice" to null
    if (body.invoice_id === "no-invoice") {
      body.invoice_id = null
    }

    // Create the receipt
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        ...body,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Receipt creation error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // If there's an invoice, update its status to "paid"
    if (body.invoice_id) {
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", body.invoice_id)

      if (updateError) {
        console.error("Invoice update error:", updateError)
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
