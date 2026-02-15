import type { Exercise } from "@/types/gait-analysis";
import type { ActivityType } from "@/lib/activity-types";
import { getExercisesForGait } from "@/lib/gait-exercises";

// ---------------------------------------------------------------------------
// Stretching exercises by identified tightness/limitation
// ---------------------------------------------------------------------------

const STRETCHING_EXERCISES: Record<string, Exercise[]> = {
  hip_tightness: [
    {
      name: "90/90 Hip Stretch",
      target: "Hip internal and external rotation flexibility",
      instructions: [
        "Sit on the floor with both knees bent at 90 degrees",
        "Rotate trunk toward front leg, keeping spine tall",
        "Hold for 30 seconds, then switch sides",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep both sit bones on the floor", "Don't round your back"],
    },
    {
      name: "Kneeling Hip Flexor Stretch",
      target: "Hip flexor and psoas lengthening",
      instructions: [
        "Kneel on one knee, other foot flat in front",
        "Shift hips forward while keeping torso upright",
        "Squeeze glute on the kneeling side to deepen stretch",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep core engaged", "Don't arch lower back"],
    },
    {
      name: "Pigeon Stretch",
      target: "Deep hip rotators and glute flexibility",
      instructions: [
        "From hands and knees, bring one knee forward behind wrist",
        "Extend the other leg straight behind you",
        "Lower torso over front leg and hold",
      ],
      sets_reps: "3 x 45s per side",
      frequency: "Daily",
      form_tips: ["Keep hips square", "Use a pillow under hip if needed"],
    },
  ],
  hamstring_tightness: [
    {
      name: "Standing Hamstring Stretch",
      target: "Hamstring flexibility and posterior chain lengthening",
      instructions: [
        "Place one heel on an elevated surface at hip height or lower",
        "Keep standing leg slightly bent",
        "Hinge forward at hips until you feel a stretch",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep back flat", "Lead with chest, not head"],
    },
    {
      name: "Supine Hamstring Stretch with Strap",
      target: "Hamstring lengthening with spinal support",
      instructions: [
        "Lie on back, loop a strap around one foot",
        "Extend leg toward ceiling, keeping other leg flat",
        "Gently pull until comfortable stretch is felt",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep lower back on floor", "Don't force the stretch"],
    },
    {
      name: "Forward Fold with Bent Knees",
      target: "Global posterior chain flexibility",
      instructions: [
        "Stand with feet hip-width apart",
        "Bend knees slightly and fold forward from hips",
        "Let arms and head hang, breathe deeply",
      ],
      sets_reps: "3 x 30s",
      frequency: "Daily",
      form_tips: ["Bend knees as much as needed", "Relax neck and shoulders"],
    },
  ],
  shoulder_tightness: [
    {
      name: "Doorway Pec Stretch",
      target: "Chest and anterior shoulder flexibility",
      instructions: [
        "Stand in a doorway with arms at 90 degrees on frame",
        "Step one foot forward through the doorway",
        "Hold when you feel a chest stretch",
      ],
      sets_reps: "3 x 30s",
      frequency: "Daily",
      form_tips: ["Keep core engaged", "Don't arch lower back"],
    },
    {
      name: "Cross-Body Shoulder Stretch",
      target: "Posterior shoulder and rotator cuff flexibility",
      instructions: [
        "Bring one arm across your chest",
        "Use opposite hand to gently pull arm closer",
        "Hold and breathe into the stretch",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep shoulder down", "Don't rotate trunk"],
    },
    {
      name: "Thread the Needle",
      target: "Thoracic rotation and shoulder mobility",
      instructions: [
        "Start on hands and knees",
        "Reach one arm under your body, rotating trunk",
        "Rest shoulder on floor and hold",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Move slowly", "Breathe into the twist"],
    },
  ],
  general: [
    {
      name: "Cat-Cow Stretch",
      target: "Spinal mobility and flexibility",
      instructions: [
        "Start on hands and knees, hands under shoulders",
        "Arch back upward (cat), then drop belly down (cow)",
        "Move slowly with your breath",
      ],
      sets_reps: "3 x 10 cycles",
      frequency: "Daily",
      form_tips: ["Coordinate movement with breath", "Move through full range"],
    },
    {
      name: "World's Greatest Stretch",
      target: "Full-body mobility and flexibility",
      instructions: [
        "Step into a deep lunge position",
        "Place same-side hand on floor, rotate other arm to ceiling",
        "Hold briefly, return, and switch sides",
      ],
      sets_reps: "3 x 5 per side",
      frequency: "Daily",
      form_tips: ["Keep back knee off ground if able", "Open chest toward ceiling"],
    },
    {
      name: "Standing Quad Stretch",
      target: "Quadriceps and hip flexor flexibility",
      instructions: [
        "Stand on one leg, grab opposite ankle behind you",
        "Pull heel toward glute, keeping knees together",
        "Hold for 30 seconds",
      ],
      sets_reps: "3 x 30s per side",
      frequency: "Daily",
      form_tips: ["Keep standing knee soft", "Use wall for balance if needed"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Balance exercises by deficit type
// ---------------------------------------------------------------------------

const BALANCE_EXERCISES: Record<string, Exercise[]> = {
  single_leg_deficit: [
    {
      name: "Single-Leg Stance Progression",
      target: "Static single-leg balance and proprioception",
      instructions: [
        "Stand on one leg near a wall for safety",
        "Hold 30 seconds with eyes open",
        "Progress to eyes closed when stable",
      ],
      sets_reps: "3 x 30s per leg",
      frequency: "Daily",
      form_tips: ["Keep standing knee soft", "Focus on a fixed point"],
    },
    {
      name: "Single-Leg Reach",
      target: "Dynamic balance with reaching movements",
      instructions: [
        "Stand on one leg",
        "Reach opposite arm forward, to the side, and overhead",
        "Return to center between each reach",
      ],
      sets_reps: "3 x 8 reaches per leg",
      frequency: "Daily",
      form_tips: ["Move slowly and controlled", "Keep hip stable"],
    },
    {
      name: "Tandem Stance (Heel-to-Toe)",
      target: "Narrow base balance and coordination",
      instructions: [
        "Place one foot directly in front of the other, heel to toe",
        "Hold position with arms out for balance",
        "Progress to arms crossed on chest",
      ],
      sets_reps: "3 x 30s per lead foot",
      frequency: "Daily",
      form_tips: ["Keep weight centered", "Look straight ahead"],
    },
  ],
  weight_shift_deficit: [
    {
      name: "Lateral Weight Shifts",
      target: "Side-to-side weight transfer control",
      instructions: [
        "Stand with feet wider than shoulder width",
        "Slowly shift weight fully to one side",
        "Hold 5 seconds, then shift to the other side",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Keep torso upright", "Feel weight through whole foot"],
    },
    {
      name: "Forward/Backward Weight Shifts",
      target: "Anterior-posterior balance control",
      instructions: [
        "Stand with feet hip-width apart",
        "Rock weight forward to balls of feet, then back to heels",
        "Move slowly and controlled through full range",
      ],
      sets_reps: "3 x 10 cycles",
      frequency: "Daily",
      form_tips: ["Keep knees soft", "Don't let feet leave the ground"],
    },
    {
      name: "Clock Taps",
      target: "Multi-directional weight shifting and reach",
      instructions: [
        "Stand on one leg in center of imaginary clock",
        "Tap free foot to 12, 3, 6, and 9 o'clock positions",
        "Return to center between each tap",
      ],
      sets_reps: "3 x 4 taps per leg",
      frequency: "5x per week",
      form_tips: ["Maintain upright posture", "Control the return to center"],
    },
  ],
  dynamic_balance_deficit: [
    {
      name: "Heel-to-Toe Walking",
      target: "Dynamic narrow-base gait and balance",
      instructions: [
        "Walk in a straight line placing heel directly in front of toes",
        "Keep arms out for balance initially",
        "Walk 20 steps forward",
      ],
      sets_reps: "3 x 20 steps",
      frequency: "Daily",
      form_tips: ["Look ahead, not at feet", "Walk slowly and controlled"],
    },
    {
      name: "Lateral Step-Overs",
      target: "Dynamic lateral balance and coordination",
      instructions: [
        "Place a low object on the floor",
        "Step sideways over it, leading with one foot",
        "Step back over and repeat",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "5x per week",
      form_tips: ["Lift feet high enough to clear", "Keep core engaged"],
    },
    {
      name: "Walking with Head Turns",
      target: "Vestibular balance during dynamic movement",
      instructions: [
        "Walk in a straight line at comfortable pace",
        "Turn head side to side every 2-3 steps",
        "Maintain straight walking path",
      ],
      sets_reps: "3 x 30s walks",
      frequency: "Daily",
      form_tips: ["Start slowly", "Stay near a wall for safety"],
    },
  ],
  general: [
    {
      name: "Standing on Foam Pad",
      target: "Proprioceptive challenge and ankle stability",
      instructions: [
        "Stand with both feet on a foam pad or folded towel",
        "Hold position for 30 seconds",
        "Progress to single leg on the pad",
      ],
      sets_reps: "3 x 30s",
      frequency: "Daily",
      form_tips: ["Start with support nearby", "Keep eyes on fixed point"],
    },
    {
      name: "Marching in Place",
      target: "Dynamic balance and weight transfer",
      instructions: [
        "March in place lifting knees to hip height",
        "Swing arms naturally with each step",
        "Maintain upright posture throughout",
      ],
      sets_reps: "3 x 1 min",
      frequency: "Daily",
      form_tips: ["Lift knees high", "Control foot placement"],
    },
    {
      name: "Side Leg Raises with Hold",
      target: "Hip stability and lateral balance",
      instructions: [
        "Stand near a wall for support",
        "Lift one leg out to the side and hold",
        "Lower slowly and repeat",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Don't lean away from lifting leg", "Keep standing knee soft"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Strength exercises by form issue
// ---------------------------------------------------------------------------

const STRENGTH_EXERCISES: Record<string, Exercise[]> = {
  knee_valgus: [
    {
      name: "Banded Squats",
      target: "Glute activation to prevent knee collapse",
      instructions: [
        "Place a resistance band just above knees",
        "Squat while actively pressing knees outward against band",
        "Keep weight in heels and chest up",
      ],
      sets_reps: "3 x 12 reps",
      frequency: "4x per week",
      form_tips: ["Knees track over toes", "Push knees out through entire range"],
    },
    {
      name: "Lateral Band Walks",
      target: "Hip abductor strengthening for knee alignment",
      instructions: [
        "Place band around ankles, stand in mini-squat",
        "Step sideways maintaining band tension",
        "Keep toes forward and hips level",
      ],
      sets_reps: "3 x 15 steps each direction",
      frequency: "4x per week",
      form_tips: ["Stay in squat position", "Don't let feet come together"],
    },
    {
      name: "Single-Leg Step-Downs",
      target: "Eccentric quad control with proper knee tracking",
      instructions: [
        "Stand on a step on one leg",
        "Slowly lower opposite foot toward floor",
        "Return to standing without pushing off bottom foot",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "4x per week",
      form_tips: ["Keep knee aligned over 2nd toe", "Lower slowly (3 sec count)"],
    },
  ],
  poor_hip_hinge: [
    {
      name: "Romanian Deadlift (Bodyweight)",
      target: "Hip hinge pattern and posterior chain engagement",
      instructions: [
        "Stand with feet hip-width apart, slight knee bend",
        "Hinge at hips pushing them backward",
        "Lower until you feel hamstring stretch, then return",
      ],
      sets_reps: "3 x 10 reps",
      frequency: "4x per week",
      form_tips: ["Keep back flat", "Push hips back, not down"],
    },
    {
      name: "Wall Hip Hinge Drill",
      target: "Learning proper hip hinge mechanics",
      instructions: [
        "Stand 6 inches from wall facing away",
        "Push hips back to touch wall while keeping back flat",
        "Return to standing and repeat",
      ],
      sets_reps: "3 x 15 reps",
      frequency: "Daily",
      form_tips: ["Keep shins vertical", "Back stays neutral throughout"],
    },
    {
      name: "Glute Bridge with March",
      target: "Hip extension strength with anti-rotation control",
      instructions: [
        "Perform a glute bridge, holding hips high",
        "Slowly lift one foot, then the other (marching)",
        "Keep hips level throughout",
      ],
      sets_reps: "3 x 8 marches per side",
      frequency: "4x per week",
      form_tips: ["Don't let hips drop", "Keep core braced"],
    },
  ],
  core_weakness: [
    {
      name: "Dead Bug",
      target: "Core stability and anti-extension control",
      instructions: [
        "Lie on back, arms toward ceiling, knees at 90 degrees",
        "Slowly extend opposite arm and leg toward floor",
        "Return and switch sides",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Keep lower back pressed to floor", "Move slowly"],
    },
    {
      name: "Pallof Press",
      target: "Anti-rotation core strength",
      instructions: [
        "Attach band at chest height, stand sideways",
        "Hold band at chest, press arms straight out",
        "Hold 3 seconds, return to chest, repeat",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "4x per week",
      form_tips: ["Don't rotate toward the band", "Keep feet shoulder-width"],
    },
    {
      name: "Bird Dog",
      target: "Core stability and spinal control",
      instructions: [
        "Start on hands and knees",
        "Extend opposite arm and leg simultaneously",
        "Hold 3 seconds, return, switch sides",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Keep hips level", "Don't arch lower back"],
    },
  ],
  general: [
    {
      name: "Bodyweight Squat",
      target: "Lower body strength and movement pattern",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Lower hips until thighs are parallel to floor",
        "Push through heels to return to standing",
      ],
      sets_reps: "3 x 12 reps",
      frequency: "4x per week",
      form_tips: ["Keep chest up", "Knees track over toes"],
    },
    {
      name: "Glute Bridge",
      target: "Glute and hip extensor strengthening",
      instructions: [
        "Lie on back with knees bent, feet flat",
        "Push through heels to lift hips",
        "Squeeze glutes at top, lower with control",
      ],
      sets_reps: "3 x 15 reps",
      frequency: "4x per week",
      form_tips: ["Don't hyperextend lower back", "Full squeeze at top"],
    },
    {
      name: "Wall Sit",
      target: "Isometric quad and glute endurance",
      instructions: [
        "Lean back against a wall, slide down to 90 degrees",
        "Keep knees over ankles, back flat on wall",
        "Hold for time",
      ],
      sets_reps: "3 x 30s",
      frequency: "4x per week",
      form_tips: ["Keep weight in heels", "Breathe steadily"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Range of motion exercises by joint/limitation
// ---------------------------------------------------------------------------

const ROM_EXERCISES: Record<string, Exercise[]> = {
  shoulder_limitation: [
    {
      name: "Shoulder Pendulum Swings",
      target: "Gentle shoulder joint mobilization",
      instructions: [
        "Lean forward with one arm hanging down",
        "Gently swing the arm in small circles",
        "Gradually increase circle size as tolerated",
      ],
      sets_reps: "3 x 30s each direction per arm",
      frequency: "Daily",
      form_tips: ["Let gravity do the work", "Keep movements pain-free"],
    },
    {
      name: "Wall Slides",
      target: "Shoulder flexion and scapular mobility",
      instructions: [
        "Stand facing a wall, place forearms on wall",
        "Slowly slide arms upward as far as comfortable",
        "Lower with control and repeat",
      ],
      sets_reps: "3 x 10 reps",
      frequency: "Daily",
      form_tips: ["Keep forearms on wall throughout", "Stop if painful"],
    },
    {
      name: "Towel Stretch Behind Back",
      target: "Shoulder internal and external rotation",
      instructions: [
        "Hold towel behind your back with both hands",
        "Top hand gently pulls upward, stretching bottom shoulder",
        "Switch positions and repeat",
      ],
      sets_reps: "3 x 15s per position",
      frequency: "Daily",
      form_tips: ["Gentle pulls only", "Don't force through pain"],
    },
  ],
  knee_limitation: [
    {
      name: "Heel Slides",
      target: "Knee flexion range of motion",
      instructions: [
        "Lie on back with legs extended",
        "Slowly slide heel toward buttock, bending knee",
        "Hold at end range, then extend back out",
      ],
      sets_reps: "3 x 15 reps per leg",
      frequency: "Daily",
      form_tips: ["Move within pain-free range", "Use a towel under heel to reduce friction"],
    },
    {
      name: "Prone Knee Bends",
      target: "Knee flexion with gravity assist",
      instructions: [
        "Lie face down on bed or mat",
        "Slowly bend knee, bringing heel toward buttock",
        "Hold briefly at end range, lower slowly",
      ],
      sets_reps: "3 x 12 per leg",
      frequency: "Daily",
      form_tips: ["Keep hips flat on surface", "Don't force the bend"],
    },
    {
      name: "Seated Knee Extension",
      target: "Knee extension range of motion",
      instructions: [
        "Sit in a chair with feet flat on floor",
        "Slowly straighten one knee fully",
        "Hold 5 seconds at full extension, lower slowly",
      ],
      sets_reps: "3 x 10 per leg",
      frequency: "Daily",
      form_tips: ["Try to fully straighten knee", "Control the lowering phase"],
    },
  ],
  ankle_limitation: [
    {
      name: "Ankle Alphabet",
      target: "Multi-directional ankle mobility",
      instructions: [
        "Sit with leg extended, foot off the edge",
        "Draw each letter of the alphabet with your toes",
        "Make movements as large as comfortable",
      ],
      sets_reps: "1-2 sets of full alphabet per foot",
      frequency: "Daily",
      form_tips: ["Move from ankle, not knee", "Do slowly for best results"],
    },
    {
      name: "Wall Ankle Dorsiflexion Stretch",
      target: "Ankle dorsiflexion range of motion",
      instructions: [
        "Stand facing a wall, one foot forward",
        "Bend front knee toward wall keeping heel on ground",
        "Hold at end range for 30 seconds",
      ],
      sets_reps: "3 x 30s per ankle",
      frequency: "Daily",
      form_tips: ["Keep heel grounded", "Knee should track over 2nd toe"],
    },
    {
      name: "Calf Raises with Full Range",
      target: "Ankle plantarflexion strength and range",
      instructions: [
        "Stand on edge of a step with heels hanging off",
        "Lower heels below step level",
        "Rise onto toes as high as possible",
      ],
      sets_reps: "3 x 12 reps",
      frequency: "Daily",
      form_tips: ["Full range both directions", "Hold rail for balance"],
    },
  ],
  general: [
    {
      name: "Neck Circles",
      target: "Cervical spine mobility in all planes",
      instructions: [
        "Sit tall with shoulders relaxed",
        "Slowly tilt head in a circle: ear to shoulder, chin to chest",
        "Complete 5 circles each direction",
      ],
      sets_reps: "3 x 5 circles each direction",
      frequency: "Daily",
      form_tips: ["Move slowly", "Don't force through any painful positions"],
    },
    {
      name: "Trunk Rotation",
      target: "Thoracic spine rotational mobility",
      instructions: [
        "Sit in a chair with feet flat",
        "Cross arms over chest",
        "Rotate trunk to one side, hold 5s, return and repeat other side",
      ],
      sets_reps: "3 x 10 per side",
      frequency: "Daily",
      form_tips: ["Keep hips facing forward", "Rotate from mid-back"],
    },
    {
      name: "Hip Circles",
      target: "Hip joint mobility in all planes",
      instructions: [
        "Stand on one leg, hold wall for support",
        "Draw large circles with the lifted knee",
        "Reverse direction after each set",
      ],
      sets_reps: "3 x 10 circles each direction per leg",
      frequency: "Daily",
      form_tips: ["Make circles as large as comfortable", "Keep standing leg stable"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Unified exercise lookup
// ---------------------------------------------------------------------------

export function getExercisesForActivity(
  activityType: ActivityType,
  classification: string
): Exercise[] {
  if (activityType === "gait") {
    return getExercisesForGait(classification);
  }

  const key = classification.toLowerCase().replace(/\s+/g, "_");

  const db: Record<string, Record<string, Exercise[]>> = {
    stretching: STRETCHING_EXERCISES,
    balance: BALANCE_EXERCISES,
    strength: STRENGTH_EXERCISES,
    range_of_motion: ROM_EXERCISES,
  };

  const exercises = db[activityType];
  if (!exercises) return getExercisesForGait(classification);

  return exercises[key] ?? exercises.general ?? [];
}
