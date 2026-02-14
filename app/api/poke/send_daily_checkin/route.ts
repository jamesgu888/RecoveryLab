import { NextRequest, NextResponse } from "next/server";
import { sendDailyCheckin } from "@/lib/recoverai/poke";

/**
 * POST /api/poke/send_daily_checkin
 * Trigger a daily check-in message via Poke
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

    const result = await sendDailyCheckin(patient_id, phone_or_user_id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
