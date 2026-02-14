import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/recoverai/store";
import { flag_for_doctor } from "@/lib/recoverai/tools";

function extractPainFromText(text: string) {
  const m = text.toLowerCase().match(/pain[:\s]*([0-9]{1,2})/i);
  if (m) return Number(m[1]);
  return null;
}

/**
 * POST /api/voice/webhook
 *
 * Receives voice call transcripts from Zingage (or any voice provider).
 * 
 * Two modes:
 * 1. RecoverAI mode (patient check-ins): Creates symptom event, runs escalation rules
 * 2. Interactive avatar mode: Processes user question and sends response to avatar
 *
 * Request body (RecoverAI mode):
 * {
 *   "patient_id": "abc123",
 *   "transcript": "I'm feeling pain level 8 today",
 *   "summary": "optional"
 * }
 * 
 * Request body (Interactive mode):
 * {
 *   "mode": "interactive",
 *   "session_id": "...",
 *   "session_token": "...",
 *   "transcript": "user's voice question",
 *   "conversation_history": [...],
 *   "visual_analysis": {...},
 *   "coaching": {...}
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patient_id,
      transcript,
      summary,
      mode,
      session_id,
      session_token,
      conversation_history,
      visual_analysis,
      coaching,
    } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("\n========== VOICE WEBHOOK ==========");
    console.log(`Mode: ${mode || "recoverai"}`);
    console.log(`Transcript: "${transcript}"`);

    // INTERACTIVE AVATAR MODE: User asking questions to avatar
    if (mode === "interactive") {
      if (!session_id || !session_token) {
        return NextResponse.json(
          { success: false, error: "Missing session_id or session_token for interactive mode" },
          { status: 400 }
        );
      }

      // Call the avatar respond endpoint to generate and speak response
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const responseResult = await fetch(`${baseUrl}/api/avatar/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          session_token,
          user_question: transcript,
          conversation_history: conversation_history || [],
          visual_analysis,
          coaching,
        }),
      });

      const responseData = await responseResult.json();

      console.log(`Avatar response: "${responseData.avatar_response}"`);
      console.log("========== INTERACTIVE COMPLETE ==========\n");

      return NextResponse.json({
        success: true,
        mode: "interactive",
        user_question: transcript,
        avatar_response: responseData.avatar_response,
      });
    }

    // RECOVERAI MODE: Patient check-in via voice
    if (!patient_id) {
      return NextResponse.json(
        { success: false, error: "Missing patient_id for recoverai mode" },
        { status: 400 }
      );
    }

    const pain = extractPainFromText(transcript);
    const payload = { transcript, summary, pain };

    const event = await addEvent({ patient_id, source: "zingage_call", type: "symptom", payload });

    // Run quick escalation rules
    if (pain !== null && pain >= 8) {
      const { flagEvent, providerSummary } = await flag_for_doctor({ patient_id, reason: `High pain detected from voice: ${pain}` });
      return NextResponse.json({ success: true, event, flagged: true, flagEventId: flagEvent.id, providerSummary });
    }

    const lowered = transcript.toLowerCase();
    const redWords = ["dizzy", "numb", "numbness", "sharp pain", "fall", "faint"];
    for (const w of redWords) {
      if (lowered.includes(w)) {
        const { flagEvent, providerSummary } = await flag_for_doctor({ patient_id, reason: `Keyword detected in voice: ${w}` });
        return NextResponse.json({ success: true, event, flagged: true, flagEventId: flagEvent.id, providerSummary });
      }
    }

    return NextResponse.json({ success: true, event, flagged: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
