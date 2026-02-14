import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, startSession, sendSpeakTask } from "@/lib/recoverai/heygen";

/**
 * POST /api/avatar/interactive-session
 * 
 * Creates an interactive avatar session and has the avatar speak the gait analysis results.
 * Returns session info so the user can continue asking follow-up questions via voice.
 * 
 * Request body:
 * {
 *   "visual_analysis": { ... },  // from Ollama VLM
 *   "coaching": { ... },          // from Claude
 *   "avatar_id": "optional"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "session_id": "...",
 *   "session_token": "...",
 *   "livekit_url": "...",
 *   "livekit_client_token": "...",
 *   "initial_message": "text that avatar spoke"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visual_analysis, coaching, avatar_id } = body;

    if (!visual_analysis || !coaching) {
      return NextResponse.json(
        { success: false, error: "Missing visual_analysis or coaching data" },
        { status: 400 }
      );
    }

    // Create a conversational summary of the analysis for the avatar to speak
    const initialMessage = buildInitialAvatarMessage(visual_analysis, coaching);

    console.log("\n========== INTERACTIVE AVATAR SESSION ==========");
    console.log("Creating streaming session for gait analysis results...");
    console.log(`Initial message length: ${initialMessage.length} chars`);

    // 1. Create session token (LITE mode)
    const tokenResult = await createSessionToken(avatar_id);
    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json(
        { success: false, error: "Failed to create session token" },
        { status: 500 }
      );
    }

    const { session_id, session_token } = tokenResult.data;

    // 2. Start the session to get LiveKit room
    const sessionResult = await startSession(session_token);
    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json(
        { success: false, error: "Failed to start session" },
        { status: 500 }
      );
    }

    const { livekit_url, livekit_client_token } = sessionResult.data;

    // 3. Send initial message for avatar to speak
    await sendSpeakTask(session_id, session_token, initialMessage);

    console.log(`Session created: ${session_id}`);
    console.log(`LiveKit room: ${livekit_url}`);
    console.log("Avatar is now speaking the analysis results...");
    console.log("User can ask follow-up questions via voice.");
    console.log("========== SESSION READY ==========\n");

    return NextResponse.json({
      success: true,
      session_id,
      session_token,
      livekit_url,
      livekit_client_token,
      initial_message: initialMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Interactive session error: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * Builds a natural, conversational message for the avatar to speak
 * based on the gait analysis results.
 */
function buildInitialAvatarMessage(
  visual_analysis: any,
  coaching: any
): string {
  const { gait_pattern, severity, observations } = visual_analysis;
  const { explanation, exercises, immediate_tip } = coaching;

  let message = "";

  // Greeting and overview
  if (gait_pattern && gait_pattern !== "Normal") {
    message += `Hello! I've analyzed your gait and noticed some ${severity === "severe" ? "significant" : severity} patterns that we should address. `;
    message += `Specifically, I observed ${gait_pattern.toLowerCase()} gait. `;
  } else {
    message += `Hello! I've analyzed your gait and overall it looks quite good. `;
  }

  // Key observations (pick 2-3 most important)
  if (observations && observations.length > 0) {
    message += `Here's what I noticed: `;
    const keyObs = observations.slice(0, 3);
    message += keyObs.join(", ") + ". ";
  }

  // Explanation
  if (explanation) {
    message += explanation + " ";
  }

  // Immediate tip
  if (immediate_tip) {
    message += `Here's my immediate recommendation: ${immediate_tip}. `;
  }

  // Exercises preview
  if (exercises && exercises.length > 0) {
    const firstExercise = exercises[0];
    message += `I've prepared a personalized exercise plan for you. Let's start with ${firstExercise.name}. `;
    message += `${firstExercise.how_to_do_it} `;
    if (firstExercise.reps) {
      message += `I recommend ${firstExercise.reps}. `;
    }
  }

  // Invitation for questions
  message += `Do you have any questions about your analysis or the exercises? I'm here to help!`;

  return message;
}
