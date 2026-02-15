import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GaitAnalysisResponse, StoredKeyFrame } from "@/types/gait-analysis";

const COLLECTION = "analyses";

export interface StoredAnalysis {
  id: string;
  user_id: string;
  session_id: string;
  timestamp: string;
  activity_type?: string;
  visual_analysis: GaitAnalysisResponse["visual_analysis"];
  coaching: GaitAnalysisResponse["coaching"];
  key_frames?: StoredKeyFrame[];
}

/** Strip undefined values that Firestore rejects */
function sanitize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveAnalysis(
  userId: string,
  result: GaitAnalysisResponse
): Promise<string> {
  const data = sanitize({
    user_id: userId,
    session_id: result.session_id,
    timestamp: result.timestamp,
    activity_type: result.activity_type || "gait",
    visual_analysis: result.visual_analysis,
    coaching: result.coaching,
    ...(result.key_frames ? { key_frames: result.key_frames } : {}),
  });
  const docRef = await addDoc(collection(db, COLLECTION), data);
  return docRef.id;
}

export async function getAnalysesForUser(
  userId: string
): Promise<StoredAnalysis[]> {
  // Simple equality query — no composite index needed
  const q = query(
    collection(db, COLLECTION),
    where("user_id", "==", userId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as StoredAnalysis)
  );
  // Sort client-side (newest first)
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results;
}

export async function getAnalysisById(
  id: string
): Promise<StoredAnalysis | null> {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as StoredAnalysis;
}
