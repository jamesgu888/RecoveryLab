import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";

import type {
  NvidiaVLMAnalysis,
  CoachingPlan,
  GaitAnalysisResponse,
  GaitAnalysisError,
  DebugInfo,
} from "@/types/gait-analysis";

import {
  COACHING_SYSTEM_PROMPT,
  buildCoachingUserPrompt,
  buildVLMPrompt,
} from "@/lib/prompt-templates";

// ---------------------------------------------------------------------------
// JSON extraction — models often wrap JSON in markdown or prose text
// ---------------------------------------------------------------------------

function extractJSON<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // continue
  }

  const stripped = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // continue
  }

  const start = raw.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model response");
  }

  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    throw new Error("Unbalanced braces in model response");
  }

  return JSON.parse(raw.slice(start, end + 1)) as T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  return raw ? Number(raw) : fallback;
}

/** Strip `data:image/...;base64,` prefix to get raw base64 */
function stripDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/** Extract the media type from a data URL (e.g. "image/jpeg") */
function getMediaType(dataUrl: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const match = dataUrl.match(/^data:(image\/\w+);/);
  const type = match?.[1];
  if (type === "image/png" || type === "image/gif" || type === "image/webp") return type;
  return "image/jpeg";
}

// ---------------------------------------------------------------------------
// POST /api/analyze-gait
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  const timestamp = new Date().toISOString();
  const debug: DebugInfo = {};

  try {
    // ------------------------------------------------------------------
    // 1. Parse individual frames from the client
    // ------------------------------------------------------------------

    const body = await request.json();
    const { frames, timestamps, duration: videoDuration } = body as {
      frames: string[];
      timestamps: number[];
      duration: number;
    };

    if (!frames || !Array.isArray(frames) || frames.length < 4) {
      return NextResponse.json<GaitAnalysisError>(
        {
          success: false,
          error: "Not enough frames provided. Please upload a video.",
          stage: "upload",
          debug,
        },
        { status: 400 }
      );
    }

    debug.grid_size_kb = Math.round(
      frames.reduce((sum, f) => sum + f.length, 0) / 1024
    );

    console.log("\n========== GAIT ANALYSIS REQUEST ==========");
    console.log(`Session: ${sessionId}`);
    console.log(`Video duration: ${videoDuration}s`);
    console.log(`Frames: ${frames.length}`);
    console.log(`Total frame data: ~${debug.grid_size_kb} KB`);

    // ------------------------------------------------------------------
    // 2. Call Claude Opus 4.6 for visual gait analysis
    // ------------------------------------------------------------------

    let vlmAnalysis: NvidiaVLMAnalysis;

    try {
      const anthropicApiKey = env("ANTHROPIC_API_KEY");
      const vlmModel = env("VLM_MODEL", "claude-opus-4-6");
      const vlmTimeout = envNumber("VLM_TIMEOUT", 120000);

      debug.vlm_model = vlmModel;

      const vlmPrompt = buildVLMPrompt(videoDuration, frames.length, timestamps);
      debug.vlm_prompt = vlmPrompt;

      console.log("\n---------- VLM REQUEST ----------");
      console.log(`Model: ${vlmModel}`);
      console.log(`Sending ${frames.length} individual frames`);
      console.log(`Prompt:\n${vlmPrompt}`);

      const vlmStart = Date.now();

      const vlmClient = new Anthropic({
        apiKey: anthropicApiKey,
        timeout: vlmTimeout,
      });

      // Build content blocks: images first, then text prompt
      const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

      for (let i = 0; i < frames.length; i++) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: getMediaType(frames[i]),
            data: stripDataUrl(frames[i]),
          },
        });
      }

      contentBlocks.push({
        type: "text",
        text: vlmPrompt,
      });

      const vlmMessage = await vlmClient.messages.create({
        model: vlmModel,
        max_tokens: 4096,
        system: "You are a clinical gait analysis expert. You identify gait abnormalities from video frames. Answer the checklist questions honestly based on what you see. Respond with ONLY a valid JSON object.",
        messages: [{ role: "user", content: contentBlocks }],
      });

      debug.vlm_duration_ms = Date.now() - vlmStart;

      const rawContent = vlmMessage.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      debug.vlm_raw_response = rawContent;

      console.log(`\nVLM Response time: ${debug.vlm_duration_ms}ms`);
      console.log(`VLM raw response:\n${rawContent}`);
      console.log("---------- END VLM RESPONSE ----------\n");

      if (!rawContent) {
        throw new Error("Claude VLM returned empty content");
      }

      vlmAnalysis = extractJSON<NvidiaVLMAnalysis>(rawContent);
      console.log(
        "VLM parsed JSON:",
        JSON.stringify(vlmAnalysis, null, 2)
      );
    } catch (vlmError) {
      const message =
        vlmError instanceof Error ? vlmError.message : String(vlmError);
      console.error(`\nVLM ERROR: ${message}`);

      return NextResponse.json<GaitAnalysisError>(
        {
          success: false,
          error: `Visual gait analysis failed: ${message}`,
          stage: "vlm_analysis",
          debug,
        },
        { status: 502 }
      );
    }

    // ------------------------------------------------------------------
    // 3. Call Claude API for exercise coaching
    // ------------------------------------------------------------------

    let coaching: CoachingPlan;

    try {
      const anthropicApiKey = env("ANTHROPIC_API_KEY");
      const claudeModel = env("CLAUDE_MODEL", "claude-haiku-4-5-20251001");
      const claudeTimeout = envNumber("CLAUDE_API_TIMEOUT", 60000);

      debug.coaching_model = claudeModel;

      const anthropic = new Anthropic({
        apiKey: anthropicApiKey,
        timeout: claudeTimeout,
      });

      const userPrompt = buildCoachingUserPrompt(vlmAnalysis);
      debug.coaching_prompt = userPrompt;

      console.log("\n---------- COACHING REQUEST ----------");
      console.log(`Model: ${claudeModel}`);
      console.log(`User prompt:\n${userPrompt}`);

      const coachingStart = Date.now();

      const message = await anthropic.messages.create({
        model: claudeModel,
        max_tokens: 1500,
        system: COACHING_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      debug.coaching_duration_ms = Date.now() - coachingStart;

      const coachingRaw = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      debug.coaching_raw_response = coachingRaw;

      console.log(
        `\nCoaching response time: ${debug.coaching_duration_ms}ms`
      );
      console.log(`Coaching raw response:\n${coachingRaw}`);
      console.log("---------- END COACHING RESPONSE ----------\n");

      if (!coachingRaw) {
        throw new Error("Claude returned empty content");
      }

      coaching = extractJSON<CoachingPlan>(coachingRaw);
    } catch (coachingError) {
      const message =
        coachingError instanceof Error
          ? coachingError.message
          : String(coachingError);
      console.error(`\nCOACHING ERROR: ${message}`);

      return NextResponse.json<GaitAnalysisResponse>(
        {
          success: true,
          session_id: sessionId,
          timestamp,
          visual_analysis: vlmAnalysis,
          coaching: {
            explanation:
              "Coaching generation failed. Please review the visual analysis below.",
            likely_causes: [],
            exercises: [],
            timeline: "N/A",
            warning_signs: [],
            immediate_tip:
              "Please consult a healthcare professional for personalized advice.",
          },
          error: `Coaching generation failed: ${message}`,
          debug,
        },
        { status: 200 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Return combined response
    // ------------------------------------------------------------------

    console.log("\n========== ANALYSIS COMPLETE ==========\n");

    return NextResponse.json<GaitAnalysisResponse>({
      success: true,
      session_id: sessionId,
      timestamp,
      visual_analysis: vlmAnalysis,
      coaching,
      debug,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`\nUNEXPECTED ERROR: ${message}`);

    return NextResponse.json<GaitAnalysisError>(
      {
        success: false,
        error: `Unexpected error: ${message}`,
        stage: "unknown",
        debug,
      },
      { status: 500 }
    );
  }
}
