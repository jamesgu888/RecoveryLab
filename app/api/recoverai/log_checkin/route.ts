import { NextRequest, NextResponse } from "next/server";
import { log_checkin } from "@/lib/recoverai/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id, pain, did_exercise, notes } = body;
    if (!patient_id || typeof pain !== "number") {
      return NextResponse.json({ success: false, error: "patient_id and numeric pain required" }, { status: 400 });
    }

    const result = await log_checkin({ patient_id, pain, did_exercise: !!did_exercise, notes });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
