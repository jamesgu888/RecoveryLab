/**
 * LiveAvatar (formerly HeyGen Streaming API) wrapper for real-time avatar interaction
 * Uses LITE mode where your app sends text and the avatar speaks it in real-time
 */

const LIVEAVATAR_API_KEY = process.env.HEYGEN_API_KEY || ""; // Same key works for LiveAvatar
const LIVEAVATAR_BASE_URL = "https://api.liveavatar.com/v1";
// Default to Ann Therapist - a professional therapist avatar perfect for rehab coaching
const DEFAULT_AVATAR_ID = process.env.HEYGEN_AVATAR_ID || "513fd1b7-7ef9-466d-9af2-344e51eeb833";

export interface Avatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  gender?: string;
}

// Map avatar IDs to their gender for voice selection
const AVATAR_GENDER_MAP: Record<string, "male" | "female"> = {
  "513fd1b7-7ef9-466d-9af2-344e51eeb833": "female", // Ann Therapist
  "7b888024-f8c9-4205-95e1-78ce01497bda": "male",   // Shawn Therapist
  "55eec60c-d665-4972-a529-bbdcaf665ab8": "male",   // Bryan Fitness Coach
  "0930fd59-c8ad-434d-ad53-b391a1768720": "male",   // Dexter Lawyer
  "bd43ce31-7425-4379-8407-60f029548e61": "male",   // Dexter Doctor Sitting
  "5761a14c-8720-4ce1-8c2b-3f351718fc79": "male",   // Dexter Doctor Standing
  "9650a758-1085-4d49-8bf3-f347565ec229": "male",   // Silas HR
  "dc2935cf-5863-4f08-943b-c7478aea59fb": "male",   // Silas Customer Support
};

/**
 * Get the gender for a given avatar ID
 * Falls back to detecting from name if not in map
 */
export function getAvatarGender(avatar_id: string, avatar_name?: string): "male" | "female" {
  // Check explicit map first
  if (AVATAR_GENDER_MAP[avatar_id]) {
    return AVATAR_GENDER_MAP[avatar_id];
  }
  
  // Try to detect from name
  if (avatar_name) {
    const nameLower = avatar_name.toLowerCase();
    // Male names/titles
    if (nameLower.includes('dexter') || nameLower.includes('shawn') || 
        nameLower.includes('bryan') || nameLower.includes('daniel') ||
        nameLower.includes('silas') || nameLower.includes('male')) {
      return "male";
    }
    // Female names/titles
    if (nameLower.includes('ann') || nameLower.includes('sarah') || 
        nameLower.includes('female') || nameLower.includes('woman')) {
      return "female";
    }
  }
  
  // Default to female if unknown
  return "female";
}

export interface SessionToken {
  session_id: string;
  session_token: string;
}

export interface LiveKitRoom {
  livekit_url: string;
  livekit_client_token: string;
  session_id: string;
}

export interface GenerateVideoParams {
  avatar_id: string;
  text: string;
  voice_id?: string;
  title?: string;
}

/**
 * List available avatars (public stock avatars from HeyGen)
 */
export async function listAvatars(): Promise<Avatar[]> {
  if (!LIVEAVATAR_API_KEY) {
    console.warn("[LiveAvatar] No API key; returning mock avatars");
    return [
      { avatar_id: "513fd1b7-7ef9-466d-9af2-344e51eeb833", avatar_name: "Ann Therapist" },
      { avatar_id: "7b888024-f8c9-4205-95e1-78ce01497bda", avatar_name: "Shawn Therapist" },
      { avatar_id: "55eec60c-d665-4972-a529-bbdcaf665ab8", avatar_name: "Bryan Fitness Coach" },
    ];
  }

  try {
    const res = await fetch(`${LIVEAVATAR_BASE_URL}/avatars/public`, {
      method: "GET",
      headers: {
        "X-API-KEY": LIVEAVATAR_API_KEY,
      },
    });

    if (!res.ok) {
      console.error(`[LiveAvatar] List avatars failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    
    // API response structure: { code, data: { results: [...] } }
    const results = data?.data?.results || [];
    
    // Map to our Avatar interface
    return results.map((avatar: any) => ({
      avatar_id: avatar.id,
      avatar_name: avatar.name,
      preview_image_url: avatar.preview_url,
      gender: avatar.gender,
    }));
  } catch (err) {
    console.error(`[LiveAvatar] List avatars error: ${err}`);
    return [];
  }
}

/**
 * Create a session token for LITE mode (we control the audio via WebSocket)
 * 
 * @param avatar_id - Optional avatar ID to use
 */
export async function createSessionToken(avatar_id?: string) {
  if (!LIVEAVATAR_API_KEY) {
    return { success: false, error: "No LiveAvatar API key set" };
  }

  // Use provided avatar_id, or fall back to default (Ann Therapist)
  const selectedAvatarId = avatar_id || DEFAULT_AVATAR_ID;

  try {
    console.log(`[LiveAvatar] Creating FULL mode session with avatar_id: ${selectedAvatarId}`);
    console.log(`[LiveAvatar] FULL mode - supports /streaming.task text-to-speech`);
    
  const requestBody: any = {
    mode: "LITE", // LITE mode - we send audio
    avatar_id: selectedAvatarId,
  };    const res = await fetch(`${LIVEAVATAR_BASE_URL}/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": LIVEAVATAR_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`[LiveAvatar] Create session failed: ${res.status}`, err);
      return { success: false, error: err };
    }

    const rawData = await res.json();
    console.log(`[LiveAvatar] Raw API response:`, JSON.stringify(rawData, null, 2));
    
    // LiveAvatar API returns: { code, data: { session_id, session_token }, message }
    const data = rawData.data || rawData as SessionToken;
    console.log(`[LiveAvatar] ✅ Session token created for avatar: ${selectedAvatarId}`);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveAvatar] Error creating session:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Send initial context message to avatar via task
 * This injects the gait analysis into the conversation memory
 */
export async function sendInitialContext(session_id: string, session_token: string, contextMessage: string) {
  try {
    console.log(`[LiveAvatar] Injecting context via task API...`);
    console.log(`[LiveAvatar] Context length: ${contextMessage.length} chars`);
    
    const res = await fetch(`${LIVEAVATAR_BASE_URL}/sessions/${session_id}/tasks/repeat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: contextMessage,
        task_mode: "SYNC",
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`[LiveAvatar] Context injection failed: ${res.status}`, err);
      return { success: false, error: err };
    }

    const data = await res.json();
    console.log(`[LiveAvatar] ✅ Context injected successfully`);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveAvatar] Context injection error:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Start the session - returns LiveKit room URL and token
 */
export async function startSession(session_token: string) {
  try {
    console.log(`[LiveAvatar] Starting session with token length: ${session_token?.length}`);
    const res = await fetch(`${LIVEAVATAR_BASE_URL}/sessions/start`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`[LiveAvatar] Start session failed: ${res.status}`, err);
      return { success: false, error: err };
    }

    const rawData = await res.json();
    console.log(`[LiveAvatar] Start session raw response:`, JSON.stringify(rawData, null, 2));
    
    // LiveAvatar API returns: { code, data: { session_id, livekit_url, livekit_client_token }, message }
    const data = rawData.data || rawData as LiveKitRoom;
    console.log(`[LiveAvatar] ✅ Session started successfully`);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Send a speak task to the avatar (LITE mode)
 * This makes the avatar speak the given text in real-time
 */
export async function sendSpeakTask(session_id: string, session_token: string, text: string) {
  try {
    console.log(`[LiveAvatar] Sending speak task to session ${session_id}: "${text.slice(0, 50)}..."`);
    const res = await fetch(`${LIVEAVATAR_BASE_URL}/sessions/${session_id}/tasks/speak`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`[LiveAvatar] Speak task failed: ${res.status}`, err);
      return { success: false, error: err };
    }

    const rawData = await res.json();
    console.log(`[LiveAvatar] Speak task response:`, JSON.stringify(rawData, null, 2));
    
    const data = rawData.data || rawData;
    console.log(`[LiveAvatar] ✅ Speak task sent successfully`);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveAvatar] Error sending speak task:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Close/stop an active session
 */
export async function closeSession(session_id: string) {
  if (!LIVEAVATAR_API_KEY) {
    return { success: false, error: "No LiveAvatar API key set" };
  }

  console.log(`[LiveAvatar] Closing session: ${session_id}`);

  // Try multiple endpoint patterns — the API may use different formats
  const endpoints = [
    { url: `${LIVEAVATAR_BASE_URL}/sessions/${session_id}/stop`, method: "POST", body: null },
    { url: `${LIVEAVATAR_BASE_URL}/sessions/stop`, method: "POST", body: JSON.stringify({ session_id }) },
    { url: `${LIVEAVATAR_BASE_URL}/sessions/${session_id}`, method: "DELETE", body: null },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[LiveAvatar] Trying: ${endpoint.method} ${endpoint.url}`);
      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          "X-API-KEY": LIVEAVATAR_API_KEY,
          "Content-Type": "application/json",
        },
        ...(endpoint.body ? { body: endpoint.body } : {}),
      });

      if (res.ok) {
        console.log(`[LiveAvatar] ✅ Session ${session_id} closed via ${endpoint.method} ${endpoint.url}`);
        return { success: true };
      }

      const err = await res.text().catch(() => "Unknown error");
      console.log(`[LiveAvatar] ${endpoint.method} ${endpoint.url} returned ${res.status}: ${err}`);
    } catch (err) {
      console.log(`[LiveAvatar] ${endpoint.method} ${endpoint.url} threw: ${err}`);
    }
  }

  console.error(`[LiveAvatar] All close attempts failed for session ${session_id}`);
  return { success: false, error: "All close endpoint patterns failed" };
}

/**
 * List all active sessions
 */
export async function listActiveSessions() {
  if (!LIVEAVATAR_API_KEY) {
    return { success: false, error: "No LiveAvatar API key set" };
  }

  try {
    const res = await fetch(`${LIVEAVATAR_BASE_URL}/sessions?type=active`, {
      method: "GET",
      headers: {
        "X-API-KEY": LIVEAVATAR_API_KEY,
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`[LiveAvatar] List sessions failed: ${res.status}`, err);
      return { success: false, error: err };
    }

    const rawData = await res.json();
    console.log(`[LiveAvatar] List sessions raw response:`, JSON.stringify(rawData, null, 2));
    const sessions = rawData.data?.sessions || rawData.data?.results || rawData.results || [];
    console.log(`[LiveAvatar] Found ${sessions.length} active session(s)`);
    if (sessions.length > 0) {
      console.log(`[LiveAvatar] Session keys:`, Object.keys(sessions[0]));
    }
    return { success: true, data: sessions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveAvatar] Error listing sessions:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Close all active sessions to free up concurrency slots
 */
export async function closeAllActiveSessions() {
  const listResult = await listActiveSessions();
  if (!listResult.success || !listResult.data?.length) return;

  console.log(`[LiveAvatar] Closing ${listResult.data.length} stale session(s)...`);
  await Promise.allSettled(
    listResult.data.map((s: any) => closeSession(s.session_id || s.id))
  );
}
