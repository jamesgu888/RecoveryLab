import { NextRequest, NextResponse } from "next/server";
import { log_checkin } from "@/lib/recoverai/tools";

function parseMessageText(text: string) {
  const lower = text.toLowerCase();
  const painMatch = lower.match(/pain[:\s]*([0-9]{1,2})/i);
  const pain = painMatch ? Number(painMatch[1]) : NaN;
  const didEx = /did (you )?do|did_exercise|exercise[:\s]*yes|i did|i've done|done/i.test(lower);
  // try to extract trailing notes after 'notes:'
  const notesMatch = lower.match(/notes?:\s*(.*)$/i);
  const notes = notesMatch ? notesMatch[1].trim() : text;
  return { pain: Number.isNaN(pain) ? null : pain, did_exercise: !!didEx, notes };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Poke webhook shape may differ; accept common fields
    const patient_id = body.patient_id || body.to || body.user_id;
    const text = body.text || body.message || body.body || "";
    if (!patient_id || !text) {
      return NextResponse.json({ success: false, error: "patient_id and text required" }, { status: 400 });
    }

    const parsed = parseMessageText(String(text));

    // If it's clearly a checkin with pain number, call log_checkin
    if (parsed.pain !== null) {
      const pain = parsed.pain as number;
      const did_exercise = Boolean(parsed.did_exercise);
      const notes = parsed.notes;
      const result = await log_checkin({ patient_id, pain, did_exercise, notes, source: "poke_text" });
      // Respond quickly to Poke
      return NextResponse.json({ success: true, handled: true, coachMessage: result.coachMessage });
    }

    // Otherwise, log as a symptom note
    // Create a lightweight event via internal API could be done but for now return OK
    return NextResponse.json({ success: true, handled: false, message: "No checkin parsed; please send 'Pain X, notes: ...'" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
