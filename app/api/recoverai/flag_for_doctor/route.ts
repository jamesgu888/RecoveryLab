import { NextRequest, NextResponse } from "next/server";
import { flag_for_doctor } from "@/lib/recoverai/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id, reason } = body;
    if (!patient_id || !reason) {
      return NextResponse.json({ success: false, error: "patient_id and reason required" }, { status: 400 });
    }

    const result = await flag_for_doctor({ patient_id, reason });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
