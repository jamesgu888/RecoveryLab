import type { PartsInput } from "@darshanpatel2608/human-body-react";

type BodyPartKey = keyof PartsInput;

export interface GaitBodyMapping {
  high: BodyPartKey[];
  medium: BodyPartKey[];
  low: BodyPartKey[];
  good: BodyPartKey[];
}

const GAIT_BODY_PARTS: Record<string, GaitBodyMapping> = {
  antalgic: {
    high: ["left_foot", "left_leg_lower"],
    medium: ["left_leg_upper", "right_foot"],
    low: ["stomach", "right_leg_upper", "right_leg_lower"],
    good: [],
  },

  trendelenburg: {
    high: ["stomach", "left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["chest"],
    good: [],
  },

  steppage: {
    high: ["left_foot", "right_foot"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["left_leg_upper", "right_leg_upper"],
    good: [],
  },

  parkinsonian: {
    high: ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower"],
    medium: ["left_arm", "right_arm", "chest"],
    low: ["head", "stomach"],
    good: [],
  },

  hemiplegic: {
    high: ["right_arm", "right_leg_upper"],
    medium: ["right_shoulder", "right_leg_lower", "left_leg_upper"],
    low: ["right_foot", "left_arm", "left_leg_lower", "left_foot"],
    good: [],
  },

  scissors: {
    high: ["left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower", "stomach"],
    low: ["left_foot", "right_foot"],
    good: [],
  },

  normal: {
    high: [],
    medium: [],
    low: [],
    good: ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower", "left_foot", "right_foot", "stomach"],
  },

  // --- Stretching classifications ---
  hip_tightness: {
    high: ["left_leg_upper", "right_leg_upper", "stomach"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: [],
    good: [],
  },
  hamstring_tightness: {
    high: ["left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["stomach"],
    good: [],
  },
  shoulder_tightness: {
    high: ["left_shoulder", "right_shoulder"],
    medium: ["left_arm", "right_arm"],
    low: ["chest"],
    good: [],
  },

  // --- Balance classifications ---
  single_leg_deficit: {
    high: ["left_foot", "right_foot"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["stomach"],
    good: [],
  },
  weight_shift_deficit: {
    high: ["left_leg_upper", "right_leg_upper"],
    medium: ["stomach", "left_foot", "right_foot"],
    low: [],
    good: [],
  },
  dynamic_balance_deficit: {
    high: ["left_leg_lower", "right_leg_lower", "left_foot", "right_foot"],
    medium: ["stomach", "left_leg_upper", "right_leg_upper"],
    low: ["head"],
    good: [],
  },

  // --- Strength classifications ---
  knee_valgus: {
    high: ["left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["stomach"],
    good: [],
  },
  poor_hip_hinge: {
    high: ["stomach", "left_leg_upper", "right_leg_upper"],
    medium: ["chest"],
    low: ["left_leg_lower", "right_leg_lower"],
    good: [],
  },
  core_weakness: {
    high: ["stomach"],
    medium: ["chest"],
    low: ["left_leg_upper", "right_leg_upper"],
    good: [],
  },

  // --- ROM classifications ---
  shoulder_limitation: {
    high: ["left_shoulder", "right_shoulder"],
    medium: ["left_arm", "right_arm"],
    low: ["chest"],
    good: [],
  },
  knee_limitation: {
    high: ["left_leg_lower", "right_leg_lower"],
    medium: ["left_leg_upper", "right_leg_upper"],
    low: [],
    good: [],
  },
  ankle_limitation: {
    high: ["left_foot", "right_foot"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: [],
    good: [],
  },

  // --- Exercise form classifications ---
  good_form: {
    high: [],
    medium: [],
    low: [],
    good: ["chest", "stomach", "left_shoulder", "right_shoulder", "left_arm", "right_arm", "left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower"],
  },
  alignment_issues: {
    high: ["chest", "stomach"],
    medium: ["left_shoulder", "right_shoulder"],
    low: [],
    good: ["left_leg_upper", "right_leg_upper"],
  },
  limited_rom: {
    high: [],
    medium: ["left_shoulder", "right_shoulder", "left_leg_upper", "right_leg_upper"],
    low: ["left_arm", "right_arm"],
    good: [],
  },
  compensation: {
    high: ["stomach", "chest"],
    medium: ["left_shoulder", "right_shoulder"],
    low: ["left_leg_upper", "right_leg_upper"],
    good: [],
  },
  wrong_exercise: {
    high: [],
    medium: [],
    low: [],
    good: [],
  },

  // --- Catch-all for "general" with no issues ---
  general: {
    high: [],
    medium: [],
    low: [],
    good: [],
  },
};

/**
 * Parse observations text to detect which body parts are mentioned positively.
 * Returns body part keys that should be colored as "good".
 */
function detectGoodPartsFromObservations(observations: string[]): BodyPartKey[] {
  const text = observations.join(" ").toLowerCase();
  const goodParts: Set<BodyPartKey> = new Set();

  const positivePatterns = /\b(good|full|adequate|proper|correct|strong|stable|symmetric|normal|smooth|controlled|achieved|demonstrates|maintains|achieves)\b/;

  const bodyPartKeywords: Record<string, BodyPartKey[]> = {
    "shoulder": ["left_shoulder", "right_shoulder"],
    "arm": ["left_arm", "right_arm"],
    "hand": ["left_hand", "right_hand"],
    "hip": ["left_leg_upper", "right_leg_upper"],
    "thigh": ["left_leg_upper", "right_leg_upper"],
    "knee": ["left_leg_lower", "right_leg_lower"],
    "leg": ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower"],
    "ankle": ["left_foot", "right_foot"],
    "foot": ["left_foot", "right_foot"],
    "core": ["stomach"],
    "trunk": ["chest", "stomach"],
    "spine": ["chest", "stomach"],
    "back": ["chest"],
    "chest": ["chest"],
    "head": ["head"],
    "neck": ["head"],
  };

  // Also handle laterality
  const leftKeywords: Record<string, BodyPartKey[]> = {
    "left shoulder": ["left_shoulder"],
    "left arm": ["left_arm"],
    "left hand": ["left_hand"],
    "left hip": ["left_leg_upper"],
    "left knee": ["left_leg_lower"],
    "left leg": ["left_leg_upper", "left_leg_lower"],
    "left ankle": ["left_foot"],
    "left foot": ["left_foot"],
  };
  const rightKeywords: Record<string, BodyPartKey[]> = {
    "right shoulder": ["right_shoulder"],
    "right arm": ["right_arm"],
    "right hand": ["right_hand"],
    "right hip": ["right_leg_upper"],
    "right knee": ["right_leg_lower"],
    "right leg": ["right_leg_upper", "right_leg_lower"],
    "right ankle": ["right_foot"],
    "right foot": ["right_foot"],
  };

  for (const obs of observations) {
    const lower = obs.toLowerCase();
    if (!positivePatterns.test(lower)) continue;

    // Check lateralized keywords first
    for (const [kw, parts] of Object.entries(leftKeywords)) {
      if (lower.includes(kw)) parts.forEach((p) => goodParts.add(p));
    }
    for (const [kw, parts] of Object.entries(rightKeywords)) {
      if (lower.includes(kw)) parts.forEach((p) => goodParts.add(p));
    }
    // Then general keywords
    for (const [kw, parts] of Object.entries(bodyPartKeywords)) {
      if (lower.includes(kw)) parts.forEach((p) => goodParts.add(p));
    }
  }

  return Array.from(goodParts);
}

export function getBodyPartsForGait(
  gaitType: string,
  severity?: number,
  allObservations?: string[],
): GaitBodyMapping {
  const mapping = GAIT_BODY_PARTS[gaitType] ?? GAIT_BODY_PARTS.general;

  // If severity is low (0-2) and no problem areas are highlighted, detect good parts from text
  const hasProblems = mapping.high.length > 0 || mapping.medium.length > 0;
  if (!hasProblems && allObservations && allObservations.length > 0) {
    const detectedGood = detectGoodPartsFromObservations(allObservations);
    if (detectedGood.length > 0) {
      return { ...mapping, good: [...new Set([...mapping.good, ...detectedGood])] };
    }
  }

  // Also for low severity, merge detected good parts with existing mapping
  if (severity !== undefined && severity <= 3 && allObservations && allObservations.length > 0) {
    const detectedGood = detectGoodPartsFromObservations(allObservations);
    // Only add parts that aren't already marked as problems
    const problemParts = new Set([...mapping.high, ...mapping.medium, ...mapping.low]);
    const safeGood = detectedGood.filter((p) => !problemParts.has(p));
    if (safeGood.length > 0) {
      return { ...mapping, good: [...new Set([...mapping.good, ...safeGood])] };
    }
  }

  return mapping;
}
