import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getAvatarGender } from "@/lib/recoverai/heygen";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// ElevenLabs voice IDs for male and female therapists
const VOICE_MAP = {
  female: {
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah - warm, professional female voice
    name: "Sarah"
  },
  male: {
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - professional, calm male voice
    name: "Daniel"
  }
};

/**
 * POST /api/avatar/chat
 * 
 * Handles conversational AI with gait analysis context
 * 
 * Flow:
 * 1. Receives user's speech transcript
 * 2. Sends to Claude with gait analysis context
 * 3. Gets Claude's response
 * 4. Converts to speech via ElevenLabs
 * 5. Returns audio stream
 * 
 * Request body:
 * {
 *   "user_message": "what's wrong with my gait?",
 *   "conversation_history": [...],
 *   "gait_context": "...", // Full gait analysis
 * }
 * 
 * Response: Audio stream (audio/mpeg)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_message, conversation_history = [], gait_context, avatar_id, avatar_name } = body;

    if (!user_message) {
      return NextResponse.json(
        { success: false, error: "Missing user_message" },
        { status: 400 }
      );
    }

    console.log("\n========== AVATAR CHAT REQUEST ==========");
    console.log(`User message: ${user_message}`);
    console.log(`Conversation history length: ${conversation_history.length}`);
    console.log(`Has gait context: ${!!gait_context}`);
    console.log(`Avatar ID: ${avatar_id || 'default'}`);
    console.log(`Avatar Name: ${avatar_name || 'unknown'}`);

    // Determine voice based on avatar gender
    const gender = avatar_id ? getAvatarGender(avatar_id, avatar_name) : "female";
    const voice = VOICE_MAP[gender];
    console.log(`[Voice] Using ${gender} voice: ${voice.name}`);

    // Build messages for Claude
    const systemPrompt = `You are a caring, professional physical therapist helping a patient understand their gait analysis results.

${gait_context ? `\n## Patient's Gait Analysis:\n${gait_context}\n` : ''}

Your role:
- Be warm, empathetic, and encouraging
- Explain medical concepts in simple, everyday language
- Provide actionable exercise guidance
- Answer questions about their specific condition
- CRITICAL: Keep responses EXTREMELY SHORT and conversational (1 sentence for regular questions, 2-3 sentences MAX for greetings)
- Speak naturally like you're having a quick chat, not giving a speech
- Avoid medical jargon - use plain English
- Get to the point immediately - no fluff

Remember: You're speaking via voice, so be BRIEF and conversational!`;

    // Handle initial greeting trigger
    let messages: any[] = [];
    
    if (user_message === "[START_CONSULTATION]") {
      // Generate initial greeting with gait overview
      messages = [{
        role: "user",
        content: "Greet me in 1-2 sentences and tell me the main gait issue you found. Be friendly but very concise."
      }];
    } else {
      messages = [
        ...conversation_history,
        {
          role: "user",
          content: user_message,
        },
      ];
    }

    console.log(`[Claude] Sending request with ${messages.length} messages...`);

    // Get response from Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150, // Reduced from 200 to encourage even shorter responses
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content[0].type === "text" 
      ? response.content[0].text 
      : "";

    console.log(`[Claude] Response: ${assistantMessage}`);

    // Convert to speech via ElevenLabs
    console.log(`[ElevenLabs] Converting to speech with ${voice.name} voice...`);
    
    const audioStream = await elevenlabs.textToSpeech.stream(voice.voiceId, {
      text: assistantMessage,
      modelId: "eleven_turbo_v2_5",
      voiceSettings: {
        stability: 0.6,
        similarityBoost: 0.8,
        style: 0.3, // Add some natural variation
      },
    });

    // Convert ReadableStream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log(`[ElevenLabs] ✅ Generated ${audioBuffer.length} bytes of audio`);
    console.log("========== CHAT COMPLETE ==========\n");

    // Return both text and audio
    return NextResponse.json({
      success: true,
      text: assistantMessage,
      audio: audioBuffer.toString('base64'),
      conversation_history: [
        ...conversation_history,
        { role: "user", content: user_message },
        { role: "assistant", content: assistantMessage },
      ],
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Chat error: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
