import { NextRequest, NextResponse } from "next/server";
import { get_weekly_summary } from "@/lib/recoverai/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id } = body;
    if (!patient_id) {
      return NextResponse.json({ success: false, error: "patient_id required" }, { status: 400 });
    }

    const result = await get_weekly_summary(patient_id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
