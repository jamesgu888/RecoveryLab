import { Resend } from "resend";
import { addEvent, getEventsForPatient, getEventsSince } from "@/lib/recoverai/store";
import type { PatientEvent } from "@/types/recoverai";

const RED_FLAG_KEYWORDS = [
  "dizzy",
  "dizziness",
  "numb",
  "numbness",
  "sharp pain",
  "severe",
  "fall",
  "faint",
];

// Initialize Resend with fallback for safety
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DOCTOR_EMAIL = process.env.DOCTOR_EMAIL || "khush@shubhsoln.com";

export async function log_checkin({
  patient_id,
  pain,
  did_exercise,
  notes,
  source = "poke_text",
}: {
  patient_id: string;
  pain: number;
  did_exercise: boolean;
  notes?: string;
  source?: string;
}) {
  const payload = { pain, did_exercise, notes };
  const event = await addEvent({ patient_id, source, type: "checkin", payload });

  // Determine escalation
  const foundFlags = [] as string[];
  const lower = (notes || "").toLowerCase();
  for (const k of RED_FLAG_KEYWORDS) {
    if (lower.includes(k)) foundFlags.push(k);
  }

  const shouldFlag = pain >= 8 || foundFlags.length > 0;

  let coachMessage = "Great job logging your progress. Keep following your plan.";
  if (pain >= 4 && pain <= 7) {
    coachMessage = "It sounds like you're feeling increased discomfort. Try reducing your range of motion, slow down, and rest as needed. If pain persists, consider contacting your provider.";
  } else if (pain >= 8) {
    coachMessage = "Your pain score is high. This may warrant provider review. Please consider contacting your provider or use the 'Discuss concerns' voice session.";
  } else if (foundFlags.length > 0) {
    coachMessage = `Noted: ${foundFlags.join(", ")}. This may need provider follow-up.`;
  } else if (pain <= 3) {
    coachMessage = "Nice — pain looks low. Keep up the exercises and consistency.";
  }

  // If escalation, create flag event
  let flagEvent: PatientEvent | null = null;
  if (shouldFlag) {
    flagEvent = await addEvent({
      patient_id,
      source: "system",
      type: "flag_doctor",
      payload: {
        reason: foundFlags.length > 0 ? `Keywords: ${foundFlags.join(", ")}` : `High pain: ${pain}`,
        origin_event_id: event.id,
      },
    });
  }

  return { event, coachMessage, flagged: !!flagEvent, flagEvent };
}

export async function get_weekly_summary(patient_id: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const events = await getEventsSince(patient_id, since);

  const checkins = events.filter((e) => e.type === "checkin");
  const painVals = checkins.map((c) => Number(c.payload?.pain ?? NaN)).filter((n) => !Number.isNaN(n));
  const avgPain = painVals.length ? painVals.reduce((a,b)=>a+b,0)/painVals.length : null;
  const adherence = Math.min(100, Math.round((checkins.length / 7) * 100));

  const notes: string[] = [];
  for (const c of checkins) {
    if (c.payload?.notes) notes.push(c.payload.notes);
  }

  const summaryText = `Weekly summary:\n- Adherence: ${adherence}% (${checkins.length} check-ins)\n- Avg pain: ${avgPain !== null ? avgPain.toFixed(1) : "N/A"}\n- Notes: ${notes.slice(0,5).join("; ") || "None"}`;

  const weeklyEvent = await addEvent({
    patient_id,
    source: "system",
    type: "weekly_summary",
    payload: { summary: summaryText, adherence, avgPain, note_count: notes.length },
  });

  return { weeklyEvent, summaryText };
}

export async function flag_for_doctor({ patient_id, reason }: { patient_id: string; reason: string; }) {
  // Build a small provider summary from recent events
  const recent = await getEventsForPatient(patient_id);
  const last5 = recent.slice(-10).reverse();

  const bullets = last5.map((e) => {
    const t = new Date(e.created_at).toLocaleString();
    return `- [${t}] ${e.type}: ${JSON.stringify(e.payload).slice(0,200)}`;
  });

  const providerSummary = `Flag for provider: ${reason}\nRecent events:\n${bullets.join("\n")}`;

  const flagEvent = await addEvent({
    patient_id,
    source: "system",
    type: "flag_doctor",
    payload: { reason, providerSummary },
  });

  return { flagEvent, providerSummary };
}
