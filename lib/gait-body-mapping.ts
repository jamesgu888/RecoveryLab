import type { NvidiaVLMAnalysis } from "@/types/gait-analysis";
import type { PartsInput } from "@darshanpatel2608/human-body-react";

/** Body-part keywords mapped to their BodyComponent keys */
const KEYWORD_MAP: Record<string, (keyof PartsInput)[]> = {
  head: ["head"],
  neck: ["head"],
  shoulder: ["left_shoulder", "right_shoulder"],
  arm: ["left_arm", "right_arm"],
  hand: ["left_hand", "right_hand"],
  wrist: ["left_hand", "right_hand"],
  finger: ["left_hand", "right_hand"],
  chest: ["chest"],
  trunk: ["chest", "stomach"],
  torso: ["chest", "stomach"],
  spine: ["chest", "stomach"],
  back: ["chest", "stomach"],
  abdomen: ["stomach"],
  stomach: ["stomach"],
  pelvis: ["stomach"],
  hip: ["stomach", "left_leg_upper", "right_leg_upper"],
  leg: ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower"],
  thigh: ["left_leg_upper", "right_leg_upper"],
  knee: ["left_leg_lower", "right_leg_lower"],
  shin: ["left_leg_lower", "right_leg_lower"],
  calf: ["left_leg_lower", "right_leg_lower"],
  ankle: ["left_foot", "right_foot"],
  foot: ["left_foot", "right_foot"],
  feet: ["left_foot", "right_foot"],
  toe: ["left_foot", "right_foot"],
};

const LEFT_PARTS: Record<string, (keyof PartsInput)[]> = {
  shoulder: ["left_shoulder"],
  arm: ["left_arm"],
  hand: ["left_hand"],
  wrist: ["left_hand"],
  leg: ["left_leg_upper", "left_leg_lower"],
  thigh: ["left_leg_upper"],
  knee: ["left_leg_lower"],
  shin: ["left_leg_lower"],
  calf: ["left_leg_lower"],
  hip: ["left_leg_upper"],
  ankle: ["left_foot"],
  foot: ["left_foot"],
  toe: ["left_foot"],
};

const RIGHT_PARTS: Record<string, (keyof PartsInput)[]> = {
  shoulder: ["right_shoulder"],
  arm: ["right_arm"],
  hand: ["right_hand"],
  wrist: ["right_hand"],
  leg: ["right_leg_upper", "right_leg_lower"],
  thigh: ["right_leg_upper"],
  knee: ["right_leg_lower"],
  shin: ["right_leg_lower"],
  calf: ["right_leg_lower"],
  hip: ["right_leg_upper"],
  ankle: ["right_foot"],
  foot: ["right_foot"],
  toe: ["right_foot"],
};

const GAIT_TYPE_DEFAULTS: Record<string, (keyof PartsInput)[]> = {
  antalgic: ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower", "left_foot", "right_foot"],
  trendelenburg: ["stomach", "left_leg_upper", "right_leg_upper"],
  steppage: ["left_leg_lower", "right_leg_lower", "left_foot", "right_foot"],
  parkinsonian: [
    "head", "chest", "stomach",
    "left_arm", "right_arm",
    "left_leg_upper", "right_leg_upper",
    "left_leg_lower", "right_leg_lower",
    "left_foot", "right_foot",
  ],
  hemiplegic: [
    "left_shoulder", "right_shoulder",
    "left_arm", "right_arm",
    "left_leg_upper", "right_leg_upper",
    "left_leg_lower", "right_leg_lower",
    "left_foot", "right_foot",
  ],
  scissors: [
    "left_leg_upper", "right_leg_upper",
    "left_leg_lower", "right_leg_lower",
    "left_foot", "right_foot",
    "stomach",
  ],
};

function scanKeywords(
  texts: string[],
  side?: "left" | "right"
): Set<keyof PartsInput> {
  const found = new Set<keyof PartsInput>();
  const joined = texts.join(" ").toLowerCase();

  for (const [keyword, parts] of Object.entries(KEYWORD_MAP)) {
    if (!joined.includes(keyword)) continue;

    const lookup =
      side === "left" ? LEFT_PARTS : side === "right" ? RIGHT_PARTS : KEYWORD_MAP;

    const mapped = lookup[keyword] ?? parts;
    for (const p of mapped) found.add(p);
  }

  return found;
}

export function mapGaitAnalysisToBodyParts(
  analysis: NvidiaVLMAnalysis
): PartsInput {
  const highlighted = new Set<keyof PartsInput>();

  const defaults = GAIT_TYPE_DEFAULTS[analysis.gait_type] ?? [];
  for (const p of defaults) highlighted.add(p);

  for (const p of scanKeywords(analysis.visual_observations)) highlighted.add(p);
  for (const p of scanKeywords(analysis.left_side_observations, "left")) highlighted.add(p);
  for (const p of scanKeywords(analysis.right_side_observations, "right")) highlighted.add(p);
  for (const p of scanKeywords(analysis.asymmetries)) highlighted.add(p);
  for (const p of scanKeywords(analysis.postural_issues)) highlighted.add(p);

  const ALL_PARTS: (keyof PartsInput)[] = [
    "head", "chest", "stomach",
    "left_shoulder", "right_shoulder",
    "left_arm", "right_arm",
    "left_hand", "right_hand",
    "left_leg_upper", "right_leg_upper",
    "left_leg_lower", "right_leg_lower",
    "left_foot", "right_foot",
  ];

  const result: PartsInput = {};
  for (const part of ALL_PARTS) {
    result[part] = { show: true, selected: highlighted.has(part), clickable: false };
  }
  return result;
}
