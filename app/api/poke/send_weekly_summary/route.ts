import { NextRequest, NextResponse } from "next/server";
import { get_weekly_summary } from "@/lib/recoverai/tools";
import { sendWeeklySummary } from "@/lib/recoverai/poke";

/**
 * POST /api/poke/send_weekly_summary
 * Generate weekly summary and send via Poke
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id, phone_or_user_id } = body;

    if (!patient_id || !phone_or_user_id) {
      return NextResponse.json(
        { success: false, error: "patient_id and phone_or_user_id required" },
        { status: 400 }
      );
    }

    // Generate summary
    const { summaryText } = await get_weekly_summary(patient_id);

    // Send via Poke
    const result = await sendWeeklySummary(patient_id, phone_or_user_id, summaryText);
    return NextResponse.json({ success: true, summaryText, poke: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
