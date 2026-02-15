"use server";

import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import { del } from "@vercel/blob";

import type {
  NvidiaVLMAnalysis,
  CoachingPlan,
  GaitAnalysisResponse,
  GaitAnalysisError,
  DebugInfo,
  StoredKeyFrame,
} from "@/types/gait-analysis";

import {
  COACHING_SYSTEM_PROMPT,
  buildCoachingUserPrompt,
  buildVLMPrompt,
  buildVLMPromptForActivity,
  getVLMSystemPrompt,
  getCoachingSystemPrompt,
  buildCoachingUserPromptForActivity,
  buildExerciseFormVLMPrompt,
  getExerciseFormVLMSystemPrompt,
  getExerciseFormCoachingSystemPrompt,
  buildExerciseFormCoachingUserPrompt,
} from "@/lib/prompt-templates";

import { getExercisesForGait } from "@/lib/gait-exercises";
import { getExercisesForActivity } from "@/lib/pt-exercises";
import type { ActivityType } from "@/lib/activity-types";

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

/** Fetch a blob URL and return { base64, mediaType } */
async function fetchBlobAsBase64(url: string): Promise<{
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${url}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = (
    ["image/png", "image/gif", "image/webp"].includes(contentType)
      ? contentType
      : "image/jpeg"
  ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  return { base64, mediaType };
}

// ---------------------------------------------------------------------------
// Server Action: analyzeGait
// ---------------------------------------------------------------------------

export async function analyzeGait(
  payload: string
): Promise<GaitAnalysisResponse | GaitAnalysisError> {
  const sessionId = uuidv4();
  const timestamp = new Date().toISOString();
  const debug: DebugInfo = {};

  // Track blob URLs for cleanup
  let blobUrls: string[] = [];
  let keptUrls = new Set<string>();

  try {
    const input = JSON.parse(payload) as {
      blobUrls: string[];
      timestamps: number[];
      duration: number;
      activityType?: ActivityType;
      exerciseName?: string;
      exerciseInstructions?: string[];
      exerciseFormTips?: string[];
    };
    blobUrls = input.blobUrls;
    const { timestamps, duration: videoDuration } = input;
    const activityType: ActivityType = input.activityType || "gait";
    const exerciseName = input.exerciseName;
    const exerciseInstructions = input.exerciseInstructions || [];
    const exerciseFormTips = input.exerciseFormTips || [];

    if (!blobUrls || !Array.isArray(blobUrls) || blobUrls.length < 4) {
      return {
        success: false,
        error: "Not enough frames provided. Please upload a video.",
        stage: "upload",
        debug,
      } satisfies GaitAnalysisError;
    }

    console.log("\n========== GAIT ANALYSIS REQUEST ==========");
    console.log(`Session: ${sessionId}`);
    console.log(`Video duration: ${videoDuration}s`);
    console.log(`Frames: ${blobUrls.length}`);

    // ------------------------------------------------------------------
    // 1. Fetch all frames from Vercel Blob → base64
    // ------------------------------------------------------------------

    console.log(`\nFetching ${blobUrls.length} frames from Vercel Blob...`);
    const frameData = await Promise.all(blobUrls.map(fetchBlobAsBase64));
    const totalKb = Math.round(
      frameData.reduce((sum, f) => sum + f.base64.length, 0) / 1024
    );
    debug.grid_size_kb = totalKb;
    console.log(`Total frame data fetched: ~${totalKb} KB`);

    // ------------------------------------------------------------------
    // 2. Call Claude Opus 4.6 for visual gait analysis
    // ------------------------------------------------------------------

    let vlmAnalysis: NvidiaVLMAnalysis;
    let resolvedKeyFrames: StoredKeyFrame[] = [];

    try {
      const anthropicApiKey = env("ANTHROPIC_API_KEY");
      const vlmModel = env("VLM_MODEL", "claude-opus-4-6");
      const vlmTimeout = envNumber("VLM_TIMEOUT", 120000);

      debug.vlm_model = vlmModel;

      const vlmPrompt = exerciseName
        ? buildExerciseFormVLMPrompt(exerciseName, exerciseInstructions, exerciseFormTips, videoDuration, blobUrls.length)
        : buildVLMPromptForActivity(activityType, videoDuration, blobUrls.length, timestamps);
      debug.vlm_prompt = vlmPrompt;

      console.log("\n---------- VLM REQUEST ----------");
      console.log(`Model: ${vlmModel}`);
      console.log(`Sending ${frameData.length} individual frames`);
      console.log(`Prompt:\n${vlmPrompt}`);

      const vlmStart = Date.now();

      const vlmClient = new Anthropic({
        apiKey: anthropicApiKey,
        timeout: vlmTimeout,
      });

      const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] =
        [];

      for (let i = 0; i < frameData.length; i++) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: frameData[i].mediaType,
            data: frameData[i].base64,
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
        system: exerciseName
          ? getExerciseFormVLMSystemPrompt(exerciseName)
          : getVLMSystemPrompt(activityType),
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
      console.log("VLM parsed JSON:", JSON.stringify(vlmAnalysis, null, 2));

      // Resolve key frame indices → blob URLs
      if (vlmAnalysis.key_frames && Array.isArray(vlmAnalysis.key_frames)) {
        const validFrames = vlmAnalysis.key_frames
          .filter(
            (kf) =>
              typeof kf.frame_index === "number" &&
              kf.frame_index >= 0 &&
              kf.frame_index < blobUrls.length
          )
          .slice(0, 4);

        resolvedKeyFrames = validFrames.map((kf) => ({
          url: blobUrls[kf.frame_index],
          annotation: kf.annotation,
          body_region: kf.body_region,
          timestamp_s: timestamps[kf.frame_index] ?? 0,
          x: Math.max(0, Math.min(100, kf.x ?? 50)),
          y: Math.max(0, Math.min(100, kf.y ?? 50)),
        }));

        // Track kept URLs so we don't delete them
        for (const kf of resolvedKeyFrames) {
          keptUrls.add(kf.url);
        }

        console.log(`Resolved ${resolvedKeyFrames.length} key frames`);
      }
    } catch (vlmError) {
      const message =
        vlmError instanceof Error ? vlmError.message : String(vlmError);
      console.error(`\nVLM ERROR: ${message}`);

      return {
        success: false,
        error: `Visual gait analysis failed: ${message}`,
        stage: "vlm_analysis",
        debug,
      } satisfies GaitAnalysisError;
    }

    // ------------------------------------------------------------------
    // 3. Generate coaching summary + use hardcoded exercises
    // ------------------------------------------------------------------

    let coaching: CoachingPlan;

    try {
      const anthropicApiKey = env("ANTHROPIC_API_KEY");
      const claudeModel = env("CLAUDE_MODEL", "claude-haiku-4-5-20251001");
      const claudeTimeout = envNumber("CLAUDE_API_TIMEOUT", 30000);

      debug.coaching_model = claudeModel;

      const anthropic = new Anthropic({
        apiKey: anthropicApiKey,
        timeout: claudeTimeout,
      });

      const userPrompt = exerciseName
        ? buildExerciseFormCoachingUserPrompt(vlmAnalysis, exerciseName)
        : buildCoachingUserPromptForActivity(vlmAnalysis, activityType);
      debug.coaching_prompt = userPrompt;

      console.log("\n---------- COACHING REQUEST ----------");
      console.log(`Model: ${claudeModel}`);

      const coachingStart = Date.now();

      const message = await anthropic.messages.create({
        model: claudeModel,
        max_tokens: 500,
        system: exerciseName
          ? getExerciseFormCoachingSystemPrompt(exerciseName)
          : getCoachingSystemPrompt(activityType),
        messages: [{ role: "user", content: userPrompt }],
      });

      debug.coaching_duration_ms = Date.now() - coachingStart;

      const coachingRaw = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      debug.coaching_raw_response = coachingRaw;

      console.log(`\nCoaching response time: ${debug.coaching_duration_ms}ms`);
      console.log(`Coaching raw response:\n${coachingRaw}`);
      console.log("---------- END COACHING RESPONSE ----------\n");

      const partial = coachingRaw
        ? extractJSON<Omit<CoachingPlan, "exercises">>(coachingRaw)
        : null;

      coaching = {
        explanation:
          partial?.explanation ?? "Analysis complete. See exercises below.",
        likely_causes: partial?.likely_causes ?? [],
        exercises: getExercisesForActivity(activityType, vlmAnalysis.gait_type),
        timeline: partial?.timeline ?? "4-8 weeks with consistent practice.",
        warning_signs: partial?.warning_signs ?? [
          "Sudden pain or weakness",
          "Loss of balance or falls",
          "Numbness or tingling in legs",
        ],
        immediate_tip:
          partial?.immediate_tip ??
          "Focus on smooth, controlled movements while walking.",
      };
    } catch (coachingError) {
      const message =
        coachingError instanceof Error
          ? coachingError.message
          : String(coachingError);
      console.error(`\nCOACHING ERROR: ${message}`);

      coaching = {
        explanation:
          "See your exercise plan below based on the detected gait pattern.",
        likely_causes: [],
        exercises: getExercisesForActivity(activityType, vlmAnalysis.gait_type),
        timeline: "4-8 weeks with consistent practice.",
        warning_signs: [
          "Sudden pain or weakness",
          "Loss of balance or falls",
          "Numbness or tingling in legs",
        ],
        immediate_tip:
          "Please consult a healthcare professional for personalized advice.",
      };
    }

    // ------------------------------------------------------------------
    // 4. Return combined response
    // ------------------------------------------------------------------

    console.log("\n========== ANALYSIS COMPLETE ==========\n");

    return {
      success: true,
      session_id: sessionId,
      timestamp,
      activity_type: activityType,
      ...(exerciseName ? { exercise_name: exerciseName } : {}),
      visual_analysis: vlmAnalysis,
      coaching,
      ...(resolvedKeyFrames.length > 0 ? { key_frames: resolvedKeyFrames } : {}),
      debug,
    } satisfies GaitAnalysisResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nUNEXPECTED ERROR: ${message}`);

    return {
      success: false,
      error: `Unexpected error: ${message}`,
      stage: "unknown",
      debug,
    } satisfies GaitAnalysisError;
  } finally {
    // Clean up blobs — keep key frame URLs for display
    const urlsToDelete = blobUrls.filter((url) => !keptUrls.has(url));
    if (urlsToDelete.length > 0) {
      try {
        await del(urlsToDelete);
        console.log(
          `Cleaned up ${urlsToDelete.length} blobs (kept ${keptUrls.size} key frames)`
        );
      } catch (cleanupErr) {
        console.error("Blob cleanup failed:", cleanupErr);
      }
    }
  }
}
