import type { PartsInput } from "@darshanpatel2608/human-body-react";

type BodyPartKey = keyof PartsInput;

export interface GaitBodyMapping {
  high: BodyPartKey[];
  medium: BodyPartKey[];
  low: BodyPartKey[];
}

const GAIT_BODY_PARTS: Record<string, GaitBodyMapping> = {
  antalgic: {
    high: ["left_foot", "right_foot", "left_leg_lower", "right_leg_lower"],
    medium: ["left_leg_upper", "right_leg_upper"],
    low: ["stomach"],
  },

  trendelenburg: {
    high: ["stomach", "left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["chest"],
  },

  steppage: {
    high: ["left_foot", "right_foot"],
    medium: ["left_leg_lower", "right_leg_lower"],
    low: ["left_leg_upper", "right_leg_upper"],
  },

  parkinsonian: {
    high: ["left_leg_upper", "right_leg_upper", "left_leg_lower", "right_leg_lower"],
    medium: ["left_arm", "right_arm", "chest"],
    low: ["head", "stomach"],
  },

  hemiplegic: {
    high: ["left_arm", "right_arm", "left_leg_upper", "right_leg_upper"],
    medium: ["left_shoulder", "right_shoulder", "left_leg_lower", "right_leg_lower"],
    low: ["left_foot", "right_foot"],
  },

  scissors: {
    high: ["left_leg_upper", "right_leg_upper"],
    medium: ["left_leg_lower", "right_leg_lower", "stomach"],
    low: ["left_foot", "right_foot"],
  },

  normal: {
    high: [],
    medium: [],
    low: [],
  },
};

export function getBodyPartsForGait(gaitType: string): GaitBodyMapping {
  return GAIT_BODY_PARTS[gaitType] ?? GAIT_BODY_PARTS.normal;
}
