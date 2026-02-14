import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { PatientEvent } from "@/types/recoverai";

const DATA_DIR = path.resolve(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "patient_events.json");

let cache: PatientEvent[] | null = null;

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(EVENTS_FILE).catch(async () => {
      await fs.writeFile(EVENTS_FILE, JSON.stringify([]), "utf8");
    });
  } catch (err) {
    // ignore
  }
}

export async function loadEvents(): Promise<PatientEvent[]> {
  if (cache) return cache;
  await ensureDataFile();
  try {
    const raw = await fs.readFile(EVENTS_FILE, "utf8");
    cache = JSON.parse(raw || "[]");
    return cache;
  } catch (err) {
    cache = [];
    return cache;
  }
}

export async function persistEvents(events: PatientEvent[]) {
  await ensureDataFile();
  cache = events;
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), "utf8");
}

export async function addEvent(e: Omit<PatientEvent, "id" | "created_at">) {
  const events = await loadEvents();
  const ev: PatientEvent = {
    ...e,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };
  events.push(ev);
  await persistEvents(events);
  return ev;
}

export async function getEventsForPatient(patient_id: string) {
  const events = await loadEvents();
  return events.filter((e) => e.patient_id === patient_id).sort((a,b)=>a.created_at.localeCompare(b.created_at));
}

export async function getEventsSince(patient_id: string, sinceIso: string) {
  const events = await getEventsForPatient(patient_id);
  return events.filter((e) => e.created_at >= sinceIso);
}

export async function clearEvents() {
  cache = [];
  await persistEvents([]);
}
