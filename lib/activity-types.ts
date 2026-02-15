export type ActivityType = "gait" | "stretching" | "balance" | "strength" | "range_of_motion";

export interface ActivityTypeConfig {
  id: ActivityType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  videoTip: string;
  analyzeButtonLabel: string;
}

export const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  {
    id: "gait",
    label: "Gait Analysis",
    description: "Analyze gait patterns and identify movement abnormalities",
    icon: "Footprints",
    videoTip: "Record yourself walking for 10-15 seconds for best results (max 30s)",
    analyzeButtonLabel: "Analyze Gait",
  },
  {
    id: "stretching",
    label: "Stretching",
    description: "Evaluate stretching form, muscle engagement, and range of motion",
    icon: "StretchHorizontal",
    videoTip: "Record yourself performing the stretch slowly and hold for a few seconds",
    analyzeButtonLabel: "Analyze Stretching",
  },
  {
    id: "balance",
    label: "Balance",
    description: "Assess single-leg balance, weight shifts, and stability drills",
    icon: "Scale",
    videoTip: "Record a balance exercise from a front or side angle for 10-20 seconds",
    analyzeButtonLabel: "Analyze Balance",
  },
  {
    id: "strength",
    label: "Strength",
    description: "Analyze form during PT strength exercises like squats and bridges",
    icon: "Dumbbell",
    videoTip: "Record 3-5 reps of the exercise from a side angle for best form analysis",
    analyzeButtonLabel: "Analyze Strength",
  },
  {
    id: "range_of_motion",
    label: "Range of Motion",
    description: "Assess joint mobility and identify movement limitations",
    icon: "MoveDiagonal",
    videoTip: "Slowly move through the full range of the joint you want assessed",
    analyzeButtonLabel: "Analyze ROM",
  },
];

export function getActivityConfig(activityType: ActivityType): ActivityTypeConfig {
  return ACTIVITY_TYPES.find((a) => a.id === activityType) ?? ACTIVITY_TYPES[0];
}
