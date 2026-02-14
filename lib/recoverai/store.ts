import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebase";
import type { PatientEvent } from "@/types/recoverai";

const COLLECTION = "patient_events";

export async function loadEvents(): Promise<PatientEvent[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  const results = snap.docs.map((d) => d.data() as PatientEvent);
  results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return results;
}

export async function addEvent(e: Omit<PatientEvent, "id" | "created_at">) {
  const ev: PatientEvent = {
    ...e,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };
  await addDoc(collection(db, COLLECTION), ev);
  return ev;
}

export async function getEventsForPatient(patient_id: string) {
  const q = query(
    collection(db, COLLECTION),
    where("patient_id", "==", patient_id)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => d.data() as PatientEvent);
  results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return results;
}

export async function getEventsForPatients(
  patientIds: string[]
): Promise<PatientEvent[]> {
  if (patientIds.length === 0) return [];
  // Firestore 'in' queries support up to 30 values
  const chunks: string[][] = [];
  for (let i = 0; i < patientIds.length; i += 30) {
    chunks.push(patientIds.slice(i, i + 30));
  }
  const allEvents: PatientEvent[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, COLLECTION),
      where("patient_id", "in", chunk)
    );
    const snap = await getDocs(q);
    allEvents.push(...snap.docs.map((d) => d.data() as PatientEvent));
  }
  allEvents.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return allEvents;
}

export async function getEventsSince(patient_id: string, sinceIso: string) {
  // Query by patient_id only, filter client-side to avoid composite index
  const q = query(
    collection(db, COLLECTION),
    where("patient_id", "==", patient_id)
  );
  const snap = await getDocs(q);
  const results = snap.docs
    .map((d) => d.data() as PatientEvent)
    .filter((e) => e.created_at >= sinceIso);
  results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return results;
}

export async function clearEvents() {
  const snap = await getDocs(collection(db, COLLECTION));
  const deletes = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
}
