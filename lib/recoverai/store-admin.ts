import { adminDb } from "@/lib/firebase-admin";
import type { PatientEvent } from "@/types/recoverai";
import { v4 as uuidv4 } from "uuid";

const COLLECTION = "patient_events";

export async function addEventAdmin(
  e: Omit<PatientEvent, "id" | "created_at">
) {
  const ev: PatientEvent = {
    ...e,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };
  await adminDb.collection(COLLECTION).add(ev);
  return ev;
}

export async function getEventsForPatientAdmin(
  patient_id: string
): Promise<PatientEvent[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("patient_id", "==", patient_id)
    .get();
  const results = snap.docs.map((d) => d.data() as PatientEvent);
  results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return results;
}

export async function getEventsSinceAdmin(
  patient_id: string,
  sinceIso: string
): Promise<PatientEvent[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("patient_id", "==", patient_id)
    .get();
  const results = snap.docs
    .map((d) => d.data() as PatientEvent)
    .filter((e) => e.created_at >= sinceIso);
  results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return results;
}
