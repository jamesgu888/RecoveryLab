/**
 * Poke API wrapper for sending messages (daily check-ins, weekly summaries, doctor flags)
 */

import { Poke } from "poke";

/**
 * Poke API wrapper for sending messages (daily check-ins, weekly summaries, doctor flags)
 */

const POKE_API_KEY = process.env.POKE_API_KEY || "";
const POKE_MOCK_MODE = process.env.POKE_MOCK_MODE === "true";

// Initialize the Poke SDK
// Note: SDK automatically loads "POKE_API_KEY" from environment if not passed
const poke = POKE_API_KEY ? new Poke({ apiKey: POKE_API_KEY }) : null;

export interface SendMessageParams {
  to: string; // patient phone or user ID (Not used by official Poke SDK currently)
  message: string;
  metadata?: Record<string, any>;
}

export async function sendPokeMessage({ to, message, metadata }: SendMessageParams) {
  // Mock mode for testing without real API
  if (POKE_MOCK_MODE || !poke) {
    console.log("[Poke] MOCK MODE - Would send message:");
    console.log(`  To: ${to}`);
    console.log(`  Message: ${message.substring(0, 100)}...`);
    console.log(`  Metadata:`, metadata);
    return { 
      success: true, 
      mock: true,
      data: { 
        mock: true, 
        message_id: `mock-${Date.now()}`,
        to,
        message, 
        sent_at: new Date().toISOString()
      } 
    };
  }

  try {
    console.log(`[Poke] Sending message via SDK...`);
    
    // Using the official SDK
    // Note: The SDK currently sends to the authorized agent/user context
    const response = await poke.sendMessage(message);

    console.log(`[Poke] ✅ Message sent successfully!`);
    return { success: true, data: response };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Poke] Send error: ${msg}`);
    console.error(`[Poke] Ensure your POKE_API_KEY is correct.`);
    return { success: false, error: msg };
  }
}

export async function sendDailyCheckin(patientId: string, phoneOrUserId: string) {
  const message = `Good morning! Time for your daily rehab check-in.\n\nReply with:\n• Pain level (0-10)\n• Did you complete exercises? (yes/no)\n• Any notes\n\nExample: "Pain 3, did exercises, knee feels better"`;
  
  return sendPokeMessage({
    to: phoneOrUserId,
    message,
    metadata: { type: "daily_checkin", patient_id: patientId },
  });
}

export async function sendWeeklySummary(patientId: string, phoneOrUserId: string, summaryText: string) {
  const message = `📊 Weekly Recovery Summary\n\n${summaryText}\n\nKeep up the great work! Reply if you have questions.`;
  
  return sendPokeMessage({
    to: phoneOrUserId,
    message,
    metadata: { type: "weekly_summary", patient_id: patientId },
  });
}

export async function sendDoctorFlag(patientId: string, phoneOrUserId: string, reason: string) {
  const message = `⚠️ Important: We've flagged concerning symptoms (${reason}).\n\nA provider summary has been created. Please contact your care team or use "Discuss concerns" for follow-up.`;
  
  return sendPokeMessage({
    to: phoneOrUserId,
    message,
    metadata: { type: "doctor_flag", patient_id: patientId, reason },
  });
}
