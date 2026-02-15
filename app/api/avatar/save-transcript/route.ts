import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/avatar/save-transcript
 *
 * Saves the conversation transcript after a consultation ends.
 * Generates a summary and key points via Claude, then updates
 * the existing consultation PatientEvent in Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { avatar_session_id, conversation_history, patient_id } = body;

    if (!avatar_session_id || !conversation_history || !patient_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Filter out the [START_CONSULTATION] trigger message
    const messages = conversation_history.filter(
      (m: { role: string; content: string }) =>
        m.content !== "[START_CONSULTATION]"
    );

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No conversation to save",
      });
    }

    // Generate summary and key points via Claude
    const transcript = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Patient" : "Therapist"}: ${m.content}`
      )
      .join("\n");

    const summaryResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system:
        "You summarize physical therapy consultation transcripts. Be concise and actionable.",
      messages: [
        {
          role: "user",
          content: `Summarize this PT consultation transcript. Return JSON with exactly this format:
{
  "summary": "1-2 sentence overall summary",
  "key_points": ["point 1", "point 2", "point 3"]
}

Keep key_points to 3-5 bullet points covering the most important takeaways (findings, recommendations, exercises discussed).

Transcript:
${transcript}`,
        },
      ],
    });

    const summaryText =
      summaryResponse.content[0].type === "text"
        ? summaryResponse.content[0].text
        : "";

    let summary = "";
    let keyPoints: string[] = [];

    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = parsed.summary || "";
        keyPoints = parsed.key_points || [];
      }
    } catch {
      // Fallback: use raw text as summary
      summary = summaryText.slice(0, 200);
    }

    // Find and update the existing consultation event
    const eventsSnap = await adminDb
      .collection("patient_events")
      .where("patient_id", "==", patient_id)
      .where("payload.avatar_session_id", "==", avatar_session_id)
      .get();

    if (!eventsSnap.empty) {
      // Update the existing event with transcript data
      const docRef = eventsSnap.docs[0].ref;
      await docRef.update({
        "payload.transcript": messages,
        "payload.summary": summary,
        "payload.key_points": keyPoints,
        "payload.transcript_saved_at": new Date().toISOString(),
      });

      console.log(
        `[save-transcript] Updated consultation event for session ${avatar_session_id}`
      );
    } else {
      console.warn(
        `[save-transcript] No consultation event found for session ${avatar_session_id}, patient ${patient_id}`
      );
    }

    return NextResponse.json({
      success: true,
      summary,
      key_points: keyPoints,
      message_count: messages.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[save-transcript] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
