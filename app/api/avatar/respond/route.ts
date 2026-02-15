import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sendSpeakTask } from "@/lib/recoverai/heygen";
import { adminDb } from "@/lib/firebase-admin";

const anthropic = new Anthropic();

const CONVERSATIONS_COLLECTION = "avatar_conversations";

/**
 * POST /api/avatar/respond
 *
 * Generates a context-aware response to a user's follow-up question during
 * an avatar consultation, then has the avatar speak it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      session_token,
      user_question,
      conversation_history,
      visual_analysis,
      coaching,
      user_id,
      activity_type,
    } = body;

    if (!session_id || !session_token || !user_question) {
      return NextResponse.json(
        { success: false, error: "Missing session_id, session_token, or user_question" },
        { status: 400 }
      );
    }

    console.log("\n========== AVATAR RESPOND ==========");
    console.log(`Session: ${session_id}`);
    console.log(`Question: "${user_question}"`);

    // Load existing conversation from Firestore for this session
    let existingMessages: Array<{ role: string; content: string; timestamp: string }> = [];
    const convSnap = await adminDb
      .collection(CONVERSATIONS_COLLECTION)
      .where("session_id", "==", session_id)
      .limit(1)
      .get();

    if (!convSnap.empty) {
      const convData = convSnap.docs[0].data();
      existingMessages = convData.messages || [];
    }

    // Load past conversations for cross-session memory
    let pastContext = "";
    if (user_id) {
      const pastSnap = await adminDb
        .collection(CONVERSATIONS_COLLECTION)
        .where("user_id", "==", user_id)
        .limit(3)
        .get();

      const pastConvos = pastSnap.docs
        .filter((d) => d.data().session_id !== session_id)
        .slice(0, 3);

      if (pastConvos.length > 0) {
        const summaries = pastConvos.map((d) => {
          const data = d.data();
          const msgs = (data.messages || []).slice(-4);
          return msgs.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n");
        });
        pastContext = `\n\nPrevious consultation topics:\n${summaries.join("\n---\n")}`;
      }
    }

    // Build system prompt with analysis context
    const analysisType = activity_type || "gait";
    const activityLabels: Record<string, string> = {
      gait: "gait analysis",
      stretching: "stretching and flexibility assessment",
      balance: "balance and stability assessment",
      strength: "strength exercise form analysis",
      range_of_motion: "range of motion assessment",
    };
    const activityLabel = activityLabels[analysisType] || "movement analysis";

    const gaitType = visual_analysis?.gait_type || "unknown";
    const severity = visual_analysis?.severity_score || "unknown";
    const observations = visual_analysis?.visual_observations?.join(", ") || "none recorded";
    const exercises = coaching?.exercises?.map((e: { name: string }) => e.name).join(", ") || "none";
    const explanation = coaching?.explanation || "";
    const coachingPlan = coaching?.immediate_tip || "";

    const systemPrompt = `You are a friendly, knowledgeable AI recovery specialist conducting a virtual consultation about a patient's ${activityLabel} results.

Patient's ${activityLabel} context:
- Classification: ${gaitType}
- Severity: ${severity}/10
- Visual observations: ${observations}
- Recommended exercises: ${exercises}
- Explanation: ${explanation}
- Coaching tip: ${coachingPlan}
${pastContext}

Guidelines:
- Keep responses concise (2-4 sentences) since they will be spoken aloud by an avatar
- Be warm, encouraging, and professional
- Reference the patient's specific ${activityLabel} when relevant
- If asked about something outside your analysis data, be honest about limitations
- Suggest consulting a healthcare professional for medical decisions`;

    // Build message history for Claude
    const claudeMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add existing conversation history from Firestore
    for (const msg of existingMessages) {
      claudeMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // Also include any client-side conversation history
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history) {
        if (msg.role && msg.content) {
          claudeMessages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }
    }

    // Add the current question
    claudeMessages.push({ role: "user", content: user_question });

    // Call Claude for a response
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const avatarResponse =
      response.content[0].type === "text"
        ? response.content[0].text
        : "I'm sorry, I couldn't generate a response. Could you please rephrase your question?";

    console.log(`Avatar response: "${avatarResponse}"`);

    // Send the response to the avatar to speak
    await sendSpeakTask(session_id, session_token, avatarResponse);

    // Store conversation in Firestore
    const now = new Date().toISOString();
    const newMessages = [
      ...existingMessages,
      { role: "user", content: user_question, timestamp: now },
      { role: "assistant", content: avatarResponse, timestamp: now },
    ];

    if (!convSnap.empty) {
      await convSnap.docs[0].ref.update({
        messages: newMessages,
        updated_at: now,
      });
    } else {
      await adminDb.collection(CONVERSATIONS_COLLECTION).add({
        session_id,
        user_id: user_id || "",
        messages: newMessages,
        created_at: now,
        updated_at: now,
      });
    }

    console.log("========== RESPOND COMPLETE ==========\n");

    return NextResponse.json({
      success: true,
      avatar_response: avatarResponse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Avatar respond error: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
