import { NextRequest, NextResponse } from "next/server";
import { sendSpeakTask } from "@/lib/recoverai/heygen";

/**
 * POST /api/avatar/session/speak
 * Send text to an active avatar session to speak
 * Body: { session_id: string, session_token: string, text: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, session_token, text } = body;

    if (!session_id || !session_token || !text) {
      return NextResponse.json(
        { success: false, error: "session_id, session_token, and text required" },
        { status: 400 }
      );
    }

    const result = await sendSpeakTask(session_id, session_token, text);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
