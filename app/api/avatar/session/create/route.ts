import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, startSession } from "@/lib/recoverai/heygen";

/**
 * POST /api/avatar/session/create
 * Create a new streaming avatar session
 * Body: { avatar_id?: string }
 * Returns: { session_id, session_token, livekit_url, livekit_client_token }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { avatar_id } = body;

    // Step 1: Create session token
    const tokenResult = await createSessionToken(avatar_id);
    console.log("[API] Token result:", JSON.stringify(tokenResult, null, 2));
    
    if (!tokenResult.success || !tokenResult.data) {
      console.error("[API] Token creation failed:", tokenResult);
      return NextResponse.json(tokenResult, { status: 500 });
    }

    const { session_id, session_token } = tokenResult.data;
    console.log("[API] Got session_id:", session_id);
    console.log("[API] Session token length:", session_token?.length);

    // Step 2: Start session to get LiveKit room
    const startResult = await startSession(session_token);
    console.log("[API] Start result:", JSON.stringify(startResult, null, 2));
    
    if (!startResult.success || !startResult.data) {
      console.error("[API] Session start failed:", startResult);
      return NextResponse.json(startResult, { status: 500 });
    }

    const { livekit_url, livekit_client_token } = startResult.data;

    return NextResponse.json({
      success: true,
      session_id,
      session_token,
      livekit_url,
      livekit_client_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] Exception:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
