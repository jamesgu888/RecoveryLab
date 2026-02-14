import type { Exercise } from "@/types/gait-analysis";

const EXERCISES: Record<string, Exercise[]> = {
  antalgic: [
    {
      name: "Single-Leg Balance Hold",
      target: "Ankle stability and weight-bearing confidence",
      instructions: [
        "Stand near a wall for safety",
        "Shift weight onto the affected leg",
        "Hold for 15-30 seconds, gradually increasing",
      ],
      sets_reps: "3 x 30s per leg",
      frequency: "Daily",
      form_tips: ["Keep hips level", "Soft knee, not locked"],
    },
    {
      name: "Hip Bridges",
      target: "Glute activation and hip extension strength",
      instructions: [
        "Lie on back, knees bent, feet flat",
        "Push through heels, lift hips to form a straight line",
        "Squeeze glutes at top, lower with control",
      ],
      sets_reps: "3 x 12 reps",
      frequency: "Daily",
      form_tips: ["Push through heels", "Don't hyperextend lower back"],
    },
    {
      name: "Standing Hip Abduction",
      target: "Hip stabilizer strengthening for even weight distribution",
      instructions: [
        "Stand holding a chair for balance",
        "Lift one leg out to the side, keeping torso upright",
        "Lower slowly, repeat",
      ],
      sets_reps: "3 x 12 per side",
      frequency: "5x per week",
      form_tips: ["Don't lean away from the lifting leg", "Control the descent"],
    },
  ],

  trendelenburg: [
    {
      name: "Side-Lying Hip Abduction",
      target: "Gluteus medius strengthening",
      instructions: [
        "Lie on your side, bottom leg bent for stability",
        "Lift top leg 12-18 inches, keeping it straight",
        "Hold 2 seconds, lower slowly",
      ],
      sets_reps: "3 x 15 per side",
      frequency: "Daily",
      form_tips: ["Don't roll backward", "Lead with heel, not toes"],
    },
    {
      name: "Clamshells with Band",
      target: "Hip external rotator and glute activation",
      instructions: [
        "Lie on side, knees bent 45 degrees, band above knees",
        "Keep feet together, open top knee upward",
        "Hold briefly, close with control",
      ],
      sets_reps: "3 x 20 per side",
      frequency: "Daily",
      form_tips: ["Keep pelvis stable", "Move from hip, not pelvis"],
    },
    {
      name: "Single-Leg Deadlift",
      target: "Hip stability and posterior chain integration",
      instructions: [
        "Stand on one leg, slight knee bend",
        "Hinge forward at hips, extending other leg behind",
        "Return to standing with control",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "4x per week",
      form_tips: ["Keep hips square", "Maintain flat back"],
    },
  ],

  steppage: [
    {
      name: "Ankle Dorsiflexion with Band",
      target: "Tibialis anterior strengthening for foot lift",
      instructions: [
        "Sit with legs extended, band around forefoot anchored ahead",
        "Pull toes toward shin against resistance",
        "Hold 2 seconds, release slowly",
      ],
      sets_reps: "3 x 15 per foot",
      frequency: "Daily",
      form_tips: ["Control the release", "Full range of motion"],
    },
    {
      name: "Heel Walking",
      target: "Ankle dorsiflexor endurance",
      instructions: [
        "Walk on heels only, toes lifted off the ground",
        "Walk 20 steps forward, 20 steps back",
        "Keep toes as high as possible",
      ],
      sets_reps: "3 x 20 steps",
      frequency: "Daily",
      form_tips: ["Keep core engaged", "Maintain upright posture"],
    },
    {
      name: "Toe Taps",
      target: "Quick dorsiflexion activation and foot clearance",
      instructions: [
        "Sit in a chair, feet flat on floor",
        "Rapidly tap toes up and down while keeping heels on ground",
        "Maintain rhythm for 30 seconds",
      ],
      sets_reps: "3 x 30s",
      frequency: "Daily",
      form_tips: ["Keep heels planted", "Increase speed as able"],
    },
  ],

  parkinsonian: [
    {
      name: "Exaggerated Arm Swing Walking",
      target: "Reciprocal arm swing retraining",
      instructions: [
        "Walk at comfortable pace in a clear hallway",
        "Deliberately exaggerate arm swing with each step",
        "Focus on opposite arm-leg coordination",
      ],
      sets_reps: "3 x 2 min walks",
      frequency: "Daily",
      form_tips: ["Swing from shoulders", "Think big movements"],
    },
    {
      name: "High-Step Marching",
      target: "Increased step height and foot clearance",
      instructions: [
        "March in place lifting knees to hip height",
        "Swing arms with each step",
        "Gradually transition to walking forward",
      ],
      sets_reps: "3 x 1 min",
      frequency: "Daily",
      form_tips: ["Lift knees high", "Land softly heel-first"],
    },
    {
      name: "Trunk Rotation Stretch",
      target: "Thoracic mobility and reducing rigidity",
      instructions: [
        "Sit upright, feet flat on floor",
        "Rotate upper body left, hold 10 seconds",
        "Return to center, rotate right",
      ],
      sets_reps: "3 x 10 each side",
      frequency: "Daily",
      form_tips: ["Keep hips facing forward", "Breathe into the stretch"],
    },
  ],

  hemiplegic: [
    {
      name: "Seated Knee Extension",
      target: "Quadriceps activation on affected side",
      instructions: [
        "Sit in a chair, feet flat on floor",
        "Slowly straighten the affected knee",
        "Hold 5 seconds, lower with control",
      ],
      sets_reps: "3 x 10 reps",
      frequency: "Daily",
      form_tips: ["Full extension if possible", "Control the lowering phase"],
    },
    {
      name: "Weight Shifting Side to Side",
      target: "Weight bearing confidence on affected side",
      instructions: [
        "Stand with feet hip-width apart, near support",
        "Slowly shift weight to affected leg",
        "Hold 5-10 seconds, shift back",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Keep trunk upright", "Progress to longer holds"],
    },
    {
      name: "Arm Swing Practice",
      target: "Retraining affected arm movement during gait",
      instructions: [
        "Stand or sit, relax affected arm",
        "Gently swing affected arm forward and back",
        "Progress to swinging while stepping in place",
      ],
      sets_reps: "3 x 1 min",
      frequency: "Daily",
      form_tips: ["Start small, increase range", "Use mirror for feedback"],
    },
  ],

  scissors: [
    {
      name: "Standing Hip Abduction with Band",
      target: "Hip abductors to widen base of support",
      instructions: [
        "Place band around ankles, stand near wall",
        "Step affected leg out to the side against resistance",
        "Return slowly, repeat",
      ],
      sets_reps: "3 x 12 per side",
      frequency: "Daily",
      form_tips: ["Keep torso upright", "Control the return"],
    },
    {
      name: "Monster Walks",
      target: "Dynamic hip abductor control and gait retraining",
      instructions: [
        "Place band around ankles",
        "Walk forward stepping out at 45-degree angles",
        "Maintain constant band tension",
      ],
      sets_reps: "3 x 10 steps each direction",
      frequency: "5x per week",
      form_tips: ["Never let feet come together", "Stay in mini-squat"],
    },
    {
      name: "Adductor Stretch",
      target: "Inner thigh flexibility to reduce leg crossing",
      instructions: [
        "Stand with feet wide apart",
        "Shift weight to one side, bending that knee",
        "Feel stretch on inner thigh of straight leg, hold 20s",
      ],
      sets_reps: "3 x 20s per side",
      frequency: "Daily",
      form_tips: ["Keep feet pointing forward", "Don't bounce"],
    },
  ],

  normal: [
    {
      name: "Single-Leg Balance",
      target: "Proprioception and balance maintenance",
      instructions: [
        "Stand on one foot near a wall",
        "Hold 30 seconds per leg",
        "Progress by closing eyes",
      ],
      sets_reps: "3 x 30s per leg",
      frequency: "3x per week",
      form_tips: ["Soft standing knee", "Eyes on fixed point"],
    },
    {
      name: "Walking Lunges",
      target: "Dynamic leg strength and coordination",
      instructions: [
        "Step forward into lunge, both knees at 90 degrees",
        "Push through front heel to next lunge",
        "Alternate legs",
      ],
      sets_reps: "2 x 10 per leg",
      frequency: "3x per week",
      form_tips: ["Keep torso upright", "Front knee over ankle"],
    },
    {
      name: "Calf Raises",
      target: "Ankle strength for push-off power",
      instructions: [
        "Stand with feet hip-width, hands on wall",
        "Rise onto balls of feet",
        "Hold 2 seconds, lower slowly",
      ],
      sets_reps: "3 x 15",
      frequency: "3x per week",
      form_tips: ["Even pressure through all toes", "Full range of motion"],
    },
  ],
};

export function getExercisesForGait(gaitType: string): Exercise[] {
  return EXERCISES[gaitType] ?? EXERCISES.normal;
}
