import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, startSession, closeAllActiveSessions } from "@/lib/recoverai/heygen";
import { addEventAdmin } from "@/lib/recoverai/store-admin";

/**
 * POST /api/avatar/interactive-session
 * 
 * Creates an interactive avatar session and has the avatar speak the gait analysis results.
 * Returns session info so the user can continue asking follow-up questions via voice.
 * 
 * Request body:
 * {
 *   "visual_analysis": { ... },  // from Claude VLM
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
    const { visual_analysis, coaching, avatar_id, avatar_name, user_id, activity_type } = body;

    if (!visual_analysis || !coaching) {
      return NextResponse.json(
        { success: false, error: "Missing visual_analysis or coaching data" },
        { status: 400 }
      );
    }

    // Create a conversational summary of the analysis for the avatar to speak
    const initialMessage = buildInitialAvatarMessage(visual_analysis, coaching, activity_type || "gait");

    // Build comprehensive knowledge base for avatar conversations
    const knowledgeBase = buildKnowledgeBase(visual_analysis, coaching);

    console.log("\n========== INTERACTIVE AVATAR SESSION ==========");
    console.log("Creating LITE mode session with custom audio...");
    console.log(`Initial greeting length: ${initialMessage.length} chars`);
    console.log(`Knowledge base length: ${knowledgeBase.length} chars`);

    // 1. Create session token (LITE mode - we send audio via WebSocket)
    const tokenResult = await createSessionToken(avatar_id);
    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json(
        { success: false, error: "Failed to create session token" },
        { status: 500 }
      );
    }

    let { session_id, session_token } = tokenResult.data;

    // 2. Start the session to get LiveKit room
    let sessionResult = await startSession(session_token);

    // If concurrency limit hit, close stale sessions and retry once
    if (!sessionResult.success && sessionResult.error?.includes("concurrency")) {
      console.log("[LiveAvatar] Concurrency limit hit — closing stale sessions and retrying...");
      await closeAllActiveSessions();

      // Need a fresh token after closing sessions
      const retryToken = await createSessionToken(avatar_id);
      if (!retryToken.success || !retryToken.data) {
        return NextResponse.json(
          { success: false, error: "Failed to create session after cleanup" },
          { status: 500 }
        );
      }
      session_id = retryToken.data.session_id;
      session_token = retryToken.data.session_token;
      sessionResult = await startSession(session_token);
    }

    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json(
        { success: false, error: "Failed to start session" },
        { status: 500 }
      );
    }

    const { livekit_url, livekit_client_token, ws_url } = sessionResult.data;

    console.log(`[LiveAvatar] LITE mode session ready`);
    console.log(`[LiveAvatar] Session ID: ${session_id}`);
    console.log(`[LiveAvatar] WebSocket URL: ${ws_url}`);

    // Log consultation event so it appears on the dashboard
    const consultPatientId = body.session_id || session_id;
    await addEventAdmin({
      patient_id: consultPatientId,
      source: "zingage_call",
      type: "consultation",
      payload: {
        gait_type: visual_analysis.gait_type,
        severity_score: visual_analysis.severity_score,
        avatar_session_id: session_id,
      },
    }).catch((e) => console.error("Failed to log consultation event:", e));

    console.log(`Session created: ${session_id}`);
    console.log(`LiveKit room: ${livekit_url}`);
    console.log("Avatar ready - audio will be sent via WebSocket");
    console.log("========== SESSION READY ==========\n");

    return NextResponse.json({
      success: true,
      session_id,
      session_token,
      livekit_url,
      livekit_client_token,
      ws_url,
      avatar_id: avatar_id || null, // Pass avatar_id for voice selection
      avatar_name: avatar_name || null, // Pass avatar_name for voice detection
      initial_message: initialMessage, // For display purposes
      gait_context: knowledgeBase, // Pass context to frontend for chat API
      user_id: user_id || null,
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
const ACTIVITY_LABELS: Record<string, string> = {
  gait: "gait",
  stretching: "stretching form",
  balance: "balance and stability",
  strength: "exercise form",
  range_of_motion: "range of motion",
};

function buildInitialAvatarMessage(
  visual_analysis: any,
  coaching: any,
  activity_type: string = "gait"
): string {
  const { gait_type, severity_score, visual_observations } = visual_analysis;
  const { explanation, exercises, immediate_tip } = coaching;
  const activityLabel = ACTIVITY_LABELS[activity_type] || "movement";

  let message = "";

  // Greeting and overview
  const severityLabel =
    severity_score >= 7 ? "significant" : severity_score >= 4 ? "moderate" : "mild";

  if (gait_type && gait_type.toLowerCase() !== "normal" && gait_type.toLowerCase() !== "general") {
    message += `Hello! I've analyzed your ${activityLabel} and noticed some ${severityLabel} patterns that we should address. `;
    message += `Specifically, I observed ${gait_type.replace(/_/g, " ")}. `;
  } else {
    message += `Hello! I've analyzed your ${activityLabel} and overall it looks quite good. `;
  }

  // Key observations (pick 2-3 most important)
  if (visual_observations && visual_observations.length > 0) {
    message += `Here's what I noticed: `;
    const keyObs = visual_observations.slice(0, 3);
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
    if (firstExercise.instructions && firstExercise.instructions.length > 0) {
      message += firstExercise.instructions.join(" ") + " ";
    }
    if (firstExercise.sets_reps) {
      message += `I recommend ${firstExercise.sets_reps}. `;
    }
  }

  // Invitation for questions
  message += `Do you have any questions about your analysis or the exercises? I'm here to help!`;

  return message;
}

/**
 * Builds a comprehensive knowledge base for the avatar to use in conversations.
 * This allows the avatar to answer detailed questions about the gait analysis.
 */
function buildKnowledgeBase(
  visual_analysis: any,
  coaching: any
): string {
  const { 
    gait_type, 
    severity_score, 
    visual_observations,
    left_side_observations,
    right_side_observations,
    asymmetries,
    postural_issues,
  } = visual_analysis;
  
  const { 
    explanation, 
    likely_causes,
    exercises, 
    immediate_tip,
    timeline,
    warning_signs,
  } = coaching;

  let knowledge = "# Patient Gait Analysis Knowledge Base\n\n";
  
  // Overview
  knowledge += "## Analysis Overview\n";
  knowledge += `**Gait Type**: ${gait_type || 'normal'}\n`;
  knowledge += `**Severity Score**: ${severity_score}/10\n`;
  knowledge += `**Severity Level**: ${severity_score >= 7 ? 'Significant' : severity_score >= 4 ? 'Moderate' : 'Mild'}\n\n`;
  
  // Visual observations
  if (visual_observations && visual_observations.length > 0) {
    knowledge += "## Key Visual Observations\n";
    visual_observations.forEach((obs: string, idx: number) => {
      knowledge += `${idx + 1}. ${obs}\n`;
    });
    knowledge += "\n";
  }
  
  // Side-specific observations
  if (left_side_observations && left_side_observations.length > 0) {
    knowledge += "## Left Side Details\n";
    left_side_observations.forEach((obs: string) => knowledge += `- ${obs}\n`);
    knowledge += "\n";
  }
  
  if (right_side_observations && right_side_observations.length > 0) {
    knowledge += "## Right Side Details\n";
    right_side_observations.forEach((obs: string) => knowledge += `- ${obs}\n`);
    knowledge += "\n";
  }
  
  // Asymmetries
  if (asymmetries && asymmetries.length > 0) {
    knowledge += "## Left vs Right Asymmetries\n";
    asymmetries.forEach((asym: string) => knowledge += `- ${asym}\n`);
    knowledge += "\n";
  }
  
  // Postural issues
  if (postural_issues && postural_issues.length > 0) {
    knowledge += "## Posture and Trunk\n";
    postural_issues.forEach((issue: string) => knowledge += `- ${issue}\n`);
    knowledge += "\n";
  }
  
  // Clinical explanation
  if (explanation) {
    knowledge += "## Clinical Explanation\n";
    knowledge += `${explanation}\n\n`;
  }
  
  // Likely causes
  if (likely_causes && likely_causes.length > 0) {
    knowledge += "## Likely Causes\n";
    likely_causes.forEach((cause: string, idx: number) => {
      knowledge += `${idx + 1}. ${cause}\n`;
    });
    knowledge += "\n";
  }
  
  // Immediate recommendation
  if (immediate_tip) {
    knowledge += "## Immediate Recommendation\n";
    knowledge += `${immediate_tip}\n\n`;
  }
  
  // Exercise plan
  if (exercises && exercises.length > 0) {
    knowledge += "## Personalized Exercise Plan\n\n";
    exercises.forEach((ex: any, idx: number) => {
      knowledge += `### Exercise ${idx + 1}: ${ex.name}\n`;
      knowledge += `**Target**: ${ex.target || 'Overall mobility'}\n`;
      if (ex.sets_reps) knowledge += `**Sets/Reps**: ${ex.sets_reps}\n`;
      if (ex.duration) knowledge += `**Duration**: ${ex.duration}\n`;
      if (ex.frequency) knowledge += `**Frequency**: ${ex.frequency}\n`;
      
      if (ex.instructions && ex.instructions.length > 0) {
        knowledge += `**Instructions**:\n`;
        ex.instructions.forEach((inst: string, i: number) => {
          knowledge += `${i + 1}. ${inst}\n`;
        });
      }
      
      if (ex.form_tips && ex.form_tips.length > 0) {
        knowledge += `**Form Tips**:\n`;
        ex.form_tips.forEach((tip: string) => knowledge += `- ${tip}\n`);
      }
      knowledge += "\n";
    });
  }
  
  // Recovery timeline
  if (timeline) {
    knowledge += "## Expected Recovery Timeline\n";
    knowledge += `${timeline}\n\n`;
  }
  
  // Warning signs
  if (warning_signs && warning_signs.length > 0) {
    knowledge += "## Warning Signs (When to Seek Medical Help)\n";
    warning_signs.forEach((sign: string) => knowledge += `- ${sign}\n`);
    knowledge += "\n";
  }
  
  // Role definition and initial instructions
  knowledge += "## Your Role as Physical Therapist\n";
  knowledge += "You are a caring, knowledgeable physical therapist helping this patient understand their gait analysis. ";
  knowledge += "\n\n### IMPORTANT: When the patient first joins the video call:\n";
  knowledge += "**Immediately greet them and automatically present their gait analysis overview WITHOUT waiting for them to speak first.**\n\n";
  knowledge += "Follow this structure for your initial greeting:\n";
  knowledge += "1. Warm greeting (Hello! I'm your physical therapist...)\n";
  knowledge += `2. Present their gait type: ${gait_type || 'normal'} (severity ${severity_score}/10)\n`;
  knowledge += "3. Explain 2-3 key visual observations you noticed\n";
  knowledge += "4. Share the immediate recommendation\n";
  knowledge += "5. Introduce the first exercise from their personalized plan\n";
  knowledge += "6. Invite them to ask questions\n\n";
  knowledge += "After your initial presentation, answer their questions using the detailed information above. ";
  knowledge += "Be empathetic, encouraging, and clear. Focus on helping them understand and feel motivated to start their recovery.\n\n";
  knowledge += "**Remember: Start speaking immediately when they join - don't wait for them to speak first!**";
  
  return knowledge;
}
