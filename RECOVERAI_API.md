# RecoverAI / GaitGuard API Documentation

## Overview
This repo contains **GaitGuard** (gait analysis + exercise coaching) and **RecoverAI** (rehab copilot with daily check-ins, weekly summaries, voice sessions, and avatar interaction).

## RecoverAI Features

### 1. Daily Check-in Automation (Poke)
- Sends automated daily messages via Poke asking patients to log pain, exercise completion, and notes.
- Patients reply with structured text (e.g., `"Pain 3, did exercises, knee feels better"`).
- System parses reply, creates a `checkin` event, runs deterministic coaching logic, and responds.

### 2. Weekly Summary (Poke)
- Aggregates last 7 days of check-ins for a patient.
- Computes adherence % and average pain.
- Sends summary via Poke.

### 3. Doctor Escalation
- Automatically flags high pain (≥8) or red-flag keywords (dizzy, numb, sharp pain, etc.).
- Creates a `flag_doctor` event with structured provider summary.
- Optionally sends alert message to patient.

### 4. Voice Concerns (Zingage-like webhook)
- Accepts voice call transcripts via webhook.
- Creates `symptom` events and runs escalation rules.
- Since Zingage doesn't have a public API, we built a generic webhook receiver you can wire to any voice provider (Twilio, Agora, or mock).

### 5. Avatar Sandbox (HeyGen)
- Internal page where users select an avatar and hear the latest coaching message spoken aloud.
- Uses HeyGen API to generate videos/audio from text.
- Supports avatar selection (if HeyGen returns avatar list).

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Poke API (SMS/messaging automation)
POKE_API_KEY=your_poke_api_key_here

# HeyGen/LiveAvatar API (avatar streaming & video generation)
HEYGEN_API_KEY=your_liveavatar_api_key_here

# Anthropic API (for Claude coaching generation)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Ollama (local VLM for gait analysis)
OLLAMA_ENDPOINT=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5vl
```

**IMPORTANT:** Never commit your API keys to version control. Add `.env.local` to `.gitignore`.

## API Endpoints

### RecoverAI Tools

#### POST `/api/recoverai/log_checkin`
Log a patient check-in with pain, exercise status, and notes.

**Request:**
```json
{
  "patient_id": "patient-123",
  "pain": 3,
  "did_exercise": true,
  "notes": "Knee feels better today"
}
```

**Response:**
```json
{
  "success": true,
  "event": { "id": "...", "patient_id": "...", "type": "checkin", ... },
  "coachMessage": "Nice — pain looks low. Keep up the exercises and consistency.",
  "flagged": false
}
```

#### POST `/api/recoverai/get_weekly_summary`
Generate weekly summary for a patient.

**Request:**
```json
{
  "patient_id": "patient-123"
}
```

**Response:**
```json
{
  "success": true,
  "weeklyEvent": { "id": "...", "type": "weekly_summary", ... },
  "summaryText": "Weekly summary:\n- Adherence: 57% (4 check-ins)\n- Avg pain: 3.5\n- Notes: ..."
}
```

#### POST `/api/recoverai/flag_for_doctor`
Manually flag a patient for provider review.

**Request:**
```json
{
  "patient_id": "patient-123",
  "reason": "Worsening pain x3 days"
}
```

**Response:**
```json
{
  "success": true,
  "flagEvent": { "id": "...", "type": "flag_doctor", ... },
  "providerSummary": "Flag for provider: Worsening pain x3 days\nRecent events:\n- ..."
}
```

### Poke Automation

#### POST `/api/poke/send_daily_checkin`
Send a daily check-in message to a patient.

**Request:**
```json
{
  "patient_id": "patient-123",
  "phone_or_user_id": "+15551234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

#### POST `/api/poke/send_weekly_summary`
Generate and send weekly summary via Poke.

**Request:**
```json
{
  "patient_id": "patient-123",
  "phone_or_user_id": "+15551234567"
}
```

**Response:**
```json
{
  "success": true,
  "summaryText": "...",
  "poke": { "success": true, ... }
}
```

### Poke Webhook (Inbound Messages)

#### POST `/api/poke/webhook`
Receives incoming messages from Poke when patients reply.

**Expected body (from Poke):**
```json
{
  "patient_id": "patient-123",
  "text": "Pain 7, notes: knee swelling after exercise"
}
```

**Response:**
```json
{
  "success": true,
  "handled": true,
  "coachMessage": "It sounds like you're feeling increased discomfort. Try reducing your range of motion..."
}
```

### Voice Webhook (Zingage-like)

#### POST `/api/voice/webhook`
Receives voice call transcripts. Supports two modes:

**Mode 1: RecoverAI (Patient Check-ins)**
Creates symptom events and runs escalation rules.

**Request:**
```json
{
  "patient_id": "patient-123",
  "transcript": "I have pain 9 in my knee and feel dizzy",
  "summary": "Patient reports severe knee pain"
}
```

**Response:**
```json
{
  "success": true,
  "event": { ... },
  "flagged": true,
  "flagEventId": "...",
  "providerSummary": "..."
}
```

**Mode 2: Interactive Avatar**
Processes user's voice question and sends response to avatar.

**Request:**
```json
{
  "mode": "interactive",
  "session_id": "...",
  "session_token": "...",
  "transcript": "How often should I do these exercises?",
  "conversation_history": [...],
  "visual_analysis": { ... },
  "coaching": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "mode": "interactive",
  "user_question": "How often should I do these exercises?",
  "avatar_response": "I recommend doing these exercises 2-3 times per day..."
}
```
  "event": { "id": "...", "type": "symptom", ... },
  "flagged": true,
  "flagEventId": "...",
  "providerSummary": "..."
}
```

### Avatar / LiveAvatar (Streaming Mode)

#### GET `/api/avatar/list`
List available LiveAvatar avatars.

**Response:**
```json
{
  "success": true,
  "avatars": [
    { "avatar_id": "...", "avatar_name": "Dr. Sarah (Female)" },
    ...
  ]
}
```

#### POST `/api/avatar/session/create`
Create a new streaming avatar session (LITE mode - you control what avatar says).

**Request:**
```json
{
  "avatar_id": "optional_avatar_id"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "...",
  "session_token": "...",
  "livekit_url": "wss://...",
  "livekit_client_token": "..."
}
```

**What to do next:**
1. Save the `session_id` and `session_token` for sending speak tasks
2. Open the LiveKit room in a browser to see the avatar:
   ```
   https://meet.livekit.io/custom?liveKitUrl=<livekit_url>&token=<livekit_client_token>
   ```
3. Send text for the avatar to speak using `/api/avatar/session/speak`

#### POST `/api/avatar/session/speak`
Send text to an active avatar session to speak in real-time.

**Request:**
```json
{
  "session_id": "...",
  "session_token": "...",
  "text": "Great job on your recovery progress!"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**How it works:**
- Your model/LLM generates text (e.g., coaching message)
- You POST to this endpoint with the text
- The avatar speaks it immediately in the LiveKit room
- You can send multiple messages to the same session

#### POST `/api/avatar/interactive-session`
**NEW:** Creates an interactive avatar session with gait analysis results. The avatar will speak the analysis and users can ask follow-up questions via voice.

**Request:**
```json
{
  "visual_analysis": { /* from Ollama VLM */ },
  "coaching": { /* from Claude */ },
  "avatar_id": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "...",
  "session_token": "...",
  "livekit_url": "...",
  "livekit_client_token": "...",
  "initial_message": "text that avatar spoke"
}
```

**Usage Flow:**
1. User uploads gait video → analyze with `/api/analyze-gait`
2. Send results to this endpoint → avatar session created
3. Avatar speaks analysis results automatically
4. User opens LiveKit room to see avatar
5. User asks questions via voice (processed through voice webhook)

#### POST `/api/avatar/respond`
**NEW:** Processes user's voice question and generates contextual response using Claude. Sends response to avatar to speak.

**Request:**
```json
{
  "session_id": "...",
  "session_token": "...",
  "user_question": "text from voice transcription",
  "conversation_history": [
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "visual_analysis": { /* original analysis */ },
  "coaching": { /* original plan */ }
}
```

**Response:**
```json
{
  "success": true,
  "avatar_response": "text that avatar is speaking",
  "speak_result": { ... }
}
```

**How it works:**
- Uses Claude to generate contextual answer based on gait analysis + conversation history
- Automatically sends response to avatar to speak
- Detects red flags (severe pain, numbness) and recommends seeing doctor
- Keeps responses concise for natural speech

#### POST `/api/avatar/speak` (Simplified)
Quick endpoint that creates session + speaks in one call (for testing).

**Request:**
```json
{
  "text": "Your message here",
  "avatar_id": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "...",
  "session_token": "...",
  "livekit_url": "...",
  "livekit_client_token": "...",
  "speak_result": { ... }
}
```

## UI Pages

- **`/avatar-sandbox`** — Select an avatar and generate spoken coaching messages.
- **`/recoverai-admin`** — Admin panel to trigger Poke automations and test check-ins.
- **`/analyze`** — Original gait analysis (upload video → VLM + Claude).

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`** with your API keys (see above).

3. **Run dev server:**
   ```bash
   npm run dev
   ```

4. **Open** `http://localhost:3000`

5. **Test endpoints:**
   ```bash
   # Log a check-in
   curl -X POST http://localhost:3000/api/recoverai/log_checkin \
     -H 'Content-Type: application/json' \
     -d '{"patient_id":"patient-demo","pain":3,"did_exercise":true,"notes":"Feeling good"}'

   # Send daily check-in via Poke
   curl -X POST http://localhost:3000/api/poke/send_daily_checkin \
     -H 'Content-Type: application/json' \
     -d '{"patient_id":"patient-demo","phone_or_user_id":"+15551234567"}'

   # Generate avatar video
   curl -X POST http://localhost:3000/api/avatar/speak \
     -H 'Content-Type: application/json' \
     -d '{"text":"Nice — pain looks low. Keep up the exercises."}'
   ```

## Data Storage

- **Demo mode:** Events are stored in `data/patient_events.json` (file-backed, in-memory cache).
- **Production:** Replace `lib/recoverai/store.ts` with Firestore or Postgres implementation (schema already designed).

## Escalation Logic (Deterministic)

- **Pain 0–3:** Encouragement
- **Pain 4–7:** Advice to reduce range / rest
- **Pain ≥8 or red-flag keywords:** Creates `flag_doctor` event + optionally alerts patient

**Red-flag keywords:** dizzy, dizziness, numb, numbness, sharp pain, severe, fall, faint

## Security Notes

- For production, add webhook authentication (HMAC or shared secret) to `/api/poke/webhook` and `/api/voice/webhook`.
- Store API keys in environment variables (never commit to git).
- Use HTTPS and vendor BAAs for HIPAA compliance if handling real PHI.

## Next Steps

- **Firestore migration:** Replace file store with Firebase.
- **Scheduled jobs:** Use Vercel Cron or external scheduler to trigger daily/weekly Poke messages.
- **Real voice provider:** Wire Twilio Media Streams or Agora for live call analysis.
- **Advanced NLP:** Use Claude or GPT to extract pain/symptoms from freeform text instead of simple pattern matching.
- **Provider dashboard:** Build a clinician-facing UI to review flagged patients and summaries.

---

For questions or issues, see the original README or contact the dev team.
