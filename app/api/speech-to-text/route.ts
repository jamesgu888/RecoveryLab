import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
});

/**
 * POST /api/speech-to-text
 *
 * Receives an audio blob (webm/opus from MediaRecorder) and returns
 * the transcribed text via ElevenLabs Scribe.
 *
 * Request: multipart/form-data with "audio" file field
 * Response: { success: true, text: "transcribed text" }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(
      `[STT] Received audio: ${audioFile.name}, size=${audioFile.size}, type=${audioFile.type}`
    );

    // Convert File to a Blob the SDK can handle
    const arrayBuffer = await audioFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: audioFile.type || "audio/webm" });

    const result = await elevenlabs.speechToText.convert({
      file: blob,
      modelId: "scribe_v1",
      languageCode: "en",
    });

    const text = result.text?.trim() || "";
    console.log(`[STT] Transcribed: "${text}"`);

    return NextResponse.json({ success: true, text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[STT] Error: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
