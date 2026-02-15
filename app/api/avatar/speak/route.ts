import { NextRequest, NextResponse } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

/**
 * POST /api/avatar/speak
 * 
 * Makes the HeyGen avatar speak using the streaming task API
 * https://docs.heygen.com/reference/send-task
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, text } = body;

    if (!session_id || !text) {
      return NextResponse.json(
        { success: false, error: "Missing session_id or text" },
        { status: 400 }
      );
    }

    console.log(`\n[Avatar Speak] Session: ${session_id}`);
    console.log(`[Avatar Speak] Text: ${text.substring(0, 100)}...`);

    // Use HeyGen's streaming task API to make avatar speak
    const response = await fetch("https://api.heygen.com/v1/streaming.task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_API_KEY || "",
      },
      body: JSON.stringify({
        session_id: session_id,
        text: text,
      }),
    });

    const result = await response.json();
    
    console.log(`[Avatar Speak] API Response:`, result);

    if (!response.ok) {
      console.error(`[Avatar Speak] Error:`, result);
      return NextResponse.json(
        { success: false, error: result.message || "Failed to make avatar speak" },
        { status: response.status }
      );
    }

    console.log(`[Avatar Speak] ✅ Avatar speaking`);

    return NextResponse.json({
      success: true,
      data: result.data,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Avatar Speak] Error: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
