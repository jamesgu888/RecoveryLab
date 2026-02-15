import type { NvidiaVLMAnalysis } from "@/types/gait-analysis";
import type { ActivityType } from "@/lib/activity-types";

/**
 * Vision-only prompt sent to the NVIDIA VLM running on a Brev GPU instance.
 * The model receives video frames alongside this prompt and must return
 * structured JSON describing the observed gait pattern.
 */
export const NVIDIA_VLM_PROMPT = `You are a clinical gait analysis AI. Analyze the walking video frames provided and return a detailed gait assessment.

Classify the gait pattern into one of these categories:
- normal
- antalgic (pain-avoidance gait)
- trendelenburg (hip abductor weakness)
- steppage (foot drop compensation)
- parkinsonian (shuffling, reduced arm swing)
- hemiplegic (circumduction pattern)
- scissors (spastic adductor pattern)

Provide your analysis as a JSON object with exactly this structure:
{
  "gait_type": "<classification from above>",
  "severity_score": <number 0-10, where 0 is normal and 10 is most severe>,
  "visual_observations": ["<list of objective visual findings about the overall gait>"],
  "left_side_observations": ["<specific observations about the left side>"],
  "right_side_observations": ["<specific observations about the right side>"],
  "asymmetries": ["<any left-right differences noticed>"],
  "postural_issues": ["<trunk, head, or overall posture abnormalities>"],
  "confidence": "<high | medium | low>"
}

Rules:
- Be objective and describe only what you observe visually.
- Do not diagnose medical conditions; only describe the movement pattern.
- If the video quality is poor or the gait is partially occluded, lower your confidence.
- Return ONLY the JSON object, no additional text.`;

/**
 * System prompt for Claude acting as a physical therapist / movement coach.
 */
export const COACHING_SYSTEM_PROMPT = `You are an expert physical therapist and movement coach. You receive structured gait analysis observations from a vision AI system and provide personalized corrective exercise plans.

Your role:
1. Interpret the visual gait observations in clinical context.
2. Identify the most likely biomechanical causes for the observed pattern.
3. Design a safe, progressive exercise program targeting the root causes.
4. Provide clear, patient-friendly instructions anyone can follow at home.

Guidelines:
- Always err on the side of caution — recommend seeing a healthcare provider for anything that could indicate a serious condition.
- Exercises should be appropriate for general population fitness levels.
- Be CONCISE. Keep explanations to 1-2 sentences. Keep instructions brief.
- Provide exactly 3 exercises, no more.
- Keep likely_causes to 2-3 items max.
- Keep warning_signs to 3 items max.

Exercises are provided separately. You ONLY need to generate the text summary.

Respond with a JSON object matching this exact structure:
{
  "explanation": "<1-2 sentence plain-language summary of the gait pattern>",
  "likely_causes": ["<2-3 biomechanical causes>"],
  "timeline": "<1 sentence expected improvement timeline>",
  "warning_signs": ["<3 red flags that need medical attention>"],
  "immediate_tip": "<1 sentence actionable tip for right now>"
}

Return ONLY the JSON object, no additional text.`;

/**
 * Builds a VLM prompt that explains the composite grid image format,
 * giving the model temporal context about the walking sequence.
 */
export function buildVLMPrompt(
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  const timeList = timestamps
    .map((t, i) => `Frame ${i + 1}: ${t.toFixed(2)}s`)
    .join(", ");

  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s walking video (${(frameCount / duration).toFixed(1)} fps). This person has a gait abnormality — your job is to identify which one.

Answer YES or NO for each question. Be strict — look at EVERY frame carefully.

1. Is one arm held BENT and FIXED against the body (not swinging) while the other arm swings? YES/NO
2. Is one leg STIFF (knee doesn't bend) and swinging in an OUTWARD ARC? YES/NO
3. Is the person LIMPING — spending less time on one foot than the other, or taking a shorter step on one side? YES/NO
4. Are BOTH arms showing little or no swing? YES/NO
5. Are BOTH legs taking SHORT SHUFFLING steps equally? YES/NO
6. Is the person STOOPED/bent forward? YES/NO
7. Does the pelvis DROP on one side when the other foot lifts? YES/NO
8. Does one knee lift unusually HIGH (like marching)? YES/NO
9. Do the feet land CLOSE TOGETHER or CROSS toward midline? YES/NO
10. Are both legs STIFF? YES/NO

Classification rules:
- YES to 1+2 → hemiplegic
- YES to 3 (but NOT 1 or 2) → antalgic
- YES to 4+5+6 → parkinsonian
- YES to 7 → trendelenburg
- YES to 8 → steppage
- YES to 9+10 → scissors
- All NO → normal

Also select 3-4 frames that best illustrate the abnormalities you identified. For each, provide:
- frame_index: 0-based index of the frame
- annotation: 10-15 word description of what is visible at this location
- body_region: e.g. "left_knee", "right_hip", "trunk", "feet", "arms"
- x: the horizontal pixel position of the body part, as a percentage (0=left edge, 50=center, 100=right edge). Look at where the person's body actually is in the frame — if they are standing right-of-center, x should be >50.
- y: the vertical pixel position of the body part, as a percentage (0=top edge, 50=middle, 100=bottom edge). Feet are near 85-95, knees ~65-75, hips ~45-55, shoulders ~20-30, head ~5-15.
IMPORTANT: Do NOT default to x=25-35. Actually look at where the person is horizontally in each frame.

Return ONLY this JSON:
{"gait_type":"<type>","severity_score":<1-10>,"visual_observations":["<what you saw>"],"left_side_observations":["<left arm and leg details>"],"right_side_observations":["<right arm and leg details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<trunk and posture findings>"],"confidence":"<high|medium|low>","key_frames":[{"frame_index":<0-based>,"annotation":"<description>","body_region":"<region>","x":<0-100>,"y":<0-100>}]}`;
}

/**
 * Builds the user-facing prompt for Claude by formatting the NVIDIA VLM's
 * structured gait observations into a readable analysis summary.
 */
export function buildCoachingUserPrompt(analysis: NvidiaVLMAnalysis): string {
  return `Here are the gait analysis observations from our vision AI system. Please provide a corrective exercise coaching plan based on these findings.

## Gait Classification
- Type: ${analysis.gait_type}
- Severity: ${analysis.severity_score}/10
- Confidence: ${analysis.confidence}

## Visual Observations
${analysis.visual_observations.map((o) => `- ${o}`).join("\n")}

## Left Side Observations
${analysis.left_side_observations.map((o) => `- ${o}`).join("\n")}

## Right Side Observations
${analysis.right_side_observations.map((o) => `- ${o}`).join("\n")}

## Asymmetries
${analysis.asymmetries.map((o) => `- ${o}`).join("\n")}

## Postural Issues
${analysis.postural_issues.map((o) => `- ${o}`).join("\n")}

Based on these observations, provide a personalized corrective exercise plan as a JSON object.`;
}

// ---------------------------------------------------------------------------
// Activity-specific VLM prompt builders
// ---------------------------------------------------------------------------

function buildStretchingVLMPrompt(
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s stretching video (${(frameCount / duration).toFixed(1)} fps). Analyze the person's stretching form and flexibility.

Evaluate the following:
1. Is the person achieving full range of motion for the stretch? YES/NO
2. Is there visible compensation (e.g., rounding back, rotating trunk)? YES/NO
3. Is the stretch being held steady or is the person bouncing? STEADY/BOUNCING
4. Is proper alignment maintained throughout? YES/NO
5. Are there signs of muscle tightness limiting the stretch? YES/NO
6. Is the person engaging the correct muscle groups? YES/NO

Classification rules:
- Compensation + limited ROM → hip_tightness, hamstring_tightness, or shoulder_tightness (pick the most relevant)
- Good ROM but bouncing → general (needs form correction)
- Limited ROM without compensation → the specific tightness area
- Good form overall → general

Also select 3-4 frames that best illustrate the issues you identified. For each, provide:
- frame_index: 0-based index of the frame
- annotation: 10-15 word description of what is visible at this location
- body_region: e.g. "left_hip", "hamstrings", "trunk", "shoulders"
- x: the horizontal pixel position of the body part, as a percentage (0=left edge, 50=center, 100=right edge). Look at where the person's body actually is in the frame — if they are standing right-of-center, x should be >50.
- y: the vertical pixel position of the body part, as a percentage (0=top edge, 50=middle, 100=bottom edge). Feet are near 85-95, knees ~65-75, hips ~45-55, shoulders ~20-30, head ~5-15.
IMPORTANT: Do NOT default to x=25-35. Actually look at where the person is horizontally in each frame.

Return ONLY this JSON:
{"gait_type":"<classification>","severity_score":<1-10>,"visual_observations":["<what you saw about form>"],"left_side_observations":["<left side flexibility details>"],"right_side_observations":["<right side flexibility details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<alignment and compensation issues>"],"confidence":"<high|medium|low>","key_frames":[{"frame_index":<0-based>,"annotation":"<description>","body_region":"<region>","x":<0-100>,"y":<0-100>}]}`;
}

function buildBalanceVLMPrompt(
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s balance exercise video (${(frameCount / duration).toFixed(1)} fps). Analyze the person's balance and stability.

Evaluate the following:
1. Is the person able to maintain single-leg stance without significant sway? YES/NO
2. Are there visible compensatory movements (arm waving, trunk leaning)? YES/NO
3. Does the person shift weight excessively to one side? YES/NO
4. Is the standing foot/ankle stable or wobbling? STABLE/WOBBLING
5. Does the person need to touch down or grab support? YES/NO
6. Is the trunk upright and stable? YES/NO

Classification rules:
- Cannot maintain single-leg stance → single_leg_deficit
- Excessive weight shifting or lateral sway → weight_shift_deficit
- Falls or catches during dynamic movements → dynamic_balance_deficit
- Minor sway but generally stable → general

Also select 3-4 frames that best illustrate the issues you identified. For each, provide:
- frame_index: 0-based index of the frame
- annotation: 10-15 word description of what is visible at this location
- body_region: e.g. "left_ankle", "trunk", "right_hip", "arms"
- x: the horizontal pixel position of the body part, as a percentage (0=left edge, 50=center, 100=right edge). Look at where the person's body actually is in the frame — if they are standing right-of-center, x should be >50.
- y: the vertical pixel position of the body part, as a percentage (0=top edge, 50=middle, 100=bottom edge). Feet are near 85-95, knees ~65-75, hips ~45-55, shoulders ~20-30, head ~5-15.
IMPORTANT: Do NOT default to x=25-35. Actually look at where the person is horizontally in each frame.

Return ONLY this JSON:
{"gait_type":"<classification>","severity_score":<1-10>,"visual_observations":["<what you saw about balance>"],"left_side_observations":["<left side stability details>"],"right_side_observations":["<right side stability details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<trunk stability and compensations>"],"confidence":"<high|medium|low>","key_frames":[{"frame_index":<0-based>,"annotation":"<description>","body_region":"<region>","x":<0-100>,"y":<0-100>}]}`;
}

function buildStrengthVLMPrompt(
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s strength exercise video (${(frameCount / duration).toFixed(1)} fps). Analyze the person's exercise form and identify any issues.

Evaluate the following:
1. Do the knees collapse inward (valgus) during the movement? YES/NO
2. Does the person maintain a neutral spine throughout? YES/NO
3. Is there proper hip hinge mechanics (for squat/deadlift movements)? YES/NO
4. Is the movement controlled or jerky? CONTROLLED/JERKY
5. Is there visible core instability (trunk sway, rotation)? YES/NO
6. Is the person achieving appropriate depth/range for the exercise? YES/NO

Classification rules:
- Knee valgus present → knee_valgus
- Poor hip hinge or excessive forward lean → poor_hip_hinge
- Trunk instability or core weakness evident → core_weakness
- Generally good form → general

Also select 3-4 frames that best illustrate the issues you identified. For each, provide:
- frame_index: 0-based index of the frame
- annotation: 10-15 word description of what is visible at this location
- body_region: e.g. "left_knee", "spine", "right_hip", "core"
- x: the horizontal pixel position of the body part, as a percentage (0=left edge, 50=center, 100=right edge). Look at where the person's body actually is in the frame — if they are standing right-of-center, x should be >50.
- y: the vertical pixel position of the body part, as a percentage (0=top edge, 50=middle, 100=bottom edge). Feet are near 85-95, knees ~65-75, hips ~45-55, shoulders ~20-30, head ~5-15.
IMPORTANT: Do NOT default to x=25-35. Actually look at where the person is horizontally in each frame.

Return ONLY this JSON:
{"gait_type":"<classification>","severity_score":<1-10>,"visual_observations":["<what you saw about form>"],"left_side_observations":["<left side form details>"],"right_side_observations":["<right side form details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<alignment and form issues>"],"confidence":"<high|medium|low>","key_frames":[{"frame_index":<0-based>,"annotation":"<description>","body_region":"<region>","x":<0-100>,"y":<0-100>}]}`;
}

function buildRangeOfMotionVLMPrompt(
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s range of motion assessment video (${(frameCount / duration).toFixed(1)} fps). Analyze the person's joint mobility.

Evaluate the following:
1. Which joint is being assessed? (shoulder, knee, ankle, hip, spine)
2. Is the range of motion visibly limited compared to normal? YES/NO
3. Is there pain behavior visible (grimacing, guarding)? YES/NO
4. Is the movement smooth or catching/clicking? SMOOTH/CATCHING
5. Are there compensatory movements to achieve more range? YES/NO
6. Is the limitation symmetric or one-sided? SYMMETRIC/ONE-SIDED

Classification rules:
- Shoulder limitation or compensation → shoulder_limitation
- Knee limitation (flexion or extension) → knee_limitation
- Ankle limitation (dorsiflexion or plantarflexion) → ankle_limitation
- General or multiple joint limitations → general

Also select 3-4 frames that best illustrate the issues you identified. For each, provide:
- frame_index: 0-based index of the frame
- annotation: 10-15 word description of what is visible at this location
- body_region: e.g. "left_shoulder", "right_knee", "ankle", "spine"
- x: the horizontal pixel position of the body part, as a percentage (0=left edge, 50=center, 100=right edge). Look at where the person's body actually is in the frame — if they are standing right-of-center, x should be >50.
- y: the vertical pixel position of the body part, as a percentage (0=top edge, 50=middle, 100=bottom edge). Feet are near 85-95, knees ~65-75, hips ~45-55, shoulders ~20-30, head ~5-15.
IMPORTANT: Do NOT default to x=25-35. Actually look at where the person is horizontally in each frame.

Return ONLY this JSON:
{"gait_type":"<classification>","severity_score":<1-10>,"visual_observations":["<what you saw about joint mobility>"],"left_side_observations":["<left side ROM details>"],"right_side_observations":["<right side ROM details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<compensation patterns>"],"confidence":"<high|medium|low>","key_frames":[{"frame_index":<0-based>,"annotation":"<description>","body_region":"<region>","x":<0-100>,"y":<0-100>}]}`;
}

/**
 * Routes to the correct VLM prompt builder based on activity type.
 */
export function buildVLMPromptForActivity(
  activityType: ActivityType,
  duration: number,
  frameCount: number,
  timestamps: number[]
): string {
  switch (activityType) {
    case "stretching":
      return buildStretchingVLMPrompt(duration, frameCount, timestamps);
    case "balance":
      return buildBalanceVLMPrompt(duration, frameCount, timestamps);
    case "strength":
      return buildStrengthVLMPrompt(duration, frameCount, timestamps);
    case "range_of_motion":
      return buildRangeOfMotionVLMPrompt(duration, frameCount, timestamps);
    case "gait":
    default:
      return buildVLMPrompt(duration, frameCount, timestamps);
  }
}

/**
 * Returns the VLM system prompt appropriate for the given activity type.
 */
export function getVLMSystemPrompt(activityType: ActivityType): string {
  switch (activityType) {
    case "stretching":
      return "You are a clinical movement analysis expert specializing in flexibility assessment. You evaluate stretching form and range of motion from video frames. Respond with ONLY a valid JSON object.";
    case "balance":
      return "You are a clinical movement analysis expert specializing in balance and stability assessment. You evaluate balance exercises from video frames. Respond with ONLY a valid JSON object.";
    case "strength":
      return "You are a clinical movement analysis expert specializing in exercise form analysis. You evaluate strength exercise form from video frames. Respond with ONLY a valid JSON object.";
    case "range_of_motion":
      return "You are a clinical movement analysis expert specializing in joint mobility assessment. You evaluate range of motion from video frames. Respond with ONLY a valid JSON object.";
    case "gait":
    default:
      return "You are a clinical gait analysis expert. You identify gait abnormalities from video frames. Answer the checklist questions honestly based on what you see. Respond with ONLY a valid JSON object.";
  }
}

/**
 * Returns an activity-aware coaching system prompt.
 */
export function getCoachingSystemPrompt(activityType: ActivityType): string {
  const activityLabels: Record<ActivityType, string> = {
    gait: "gait analysis",
    stretching: "stretching and flexibility assessment",
    balance: "balance and stability assessment",
    strength: "strength exercise form analysis",
    range_of_motion: "range of motion assessment",
  };

  const label = activityLabels[activityType] || "movement analysis";

  return `You are an expert physical therapist and movement coach. You receive structured ${label} observations from a vision AI system and provide personalized corrective exercise plans.

Your role:
1. Interpret the visual observations in clinical context.
2. Identify the most likely biomechanical causes for the observed issues.
3. Design a safe, progressive exercise program targeting the root causes.
4. Provide clear, patient-friendly instructions anyone can follow at home.

Guidelines:
- Always err on the side of caution — recommend seeing a healthcare provider for anything that could indicate a serious condition.
- Exercises should be appropriate for general population fitness levels.
- Be CONCISE. Keep explanations to 1-2 sentences. Keep instructions brief.
- Provide exactly 3 exercises, no more.
- Keep likely_causes to 2-3 items max.
- Keep warning_signs to 3 items max.

Exercises are provided separately. You ONLY need to generate the text summary.

Respond with a JSON object matching this exact structure:
{
  "explanation": "<1-2 sentence plain-language summary of the observed pattern>",
  "likely_causes": ["<2-3 biomechanical causes>"],
  "timeline": "<1 sentence expected improvement timeline>",
  "warning_signs": ["<3 red flags that need medical attention>"],
  "immediate_tip": "<1 sentence actionable tip for right now>"
}

Return ONLY the JSON object, no additional text.`;
}

/**
 * Builds the coaching user prompt, activity-aware.
 */
export function buildCoachingUserPromptForActivity(
  analysis: NvidiaVLMAnalysis,
  activityType: ActivityType
): string {
  const activityLabels: Record<ActivityType, string> = {
    gait: "gait analysis",
    stretching: "stretching assessment",
    balance: "balance assessment",
    strength: "strength exercise analysis",
    range_of_motion: "range of motion assessment",
  };

  const label = activityLabels[activityType] || "movement analysis";

  return `Here are the ${label} observations from our vision AI system. Please provide a corrective exercise coaching plan based on these findings.

## Classification
- Type: ${analysis.gait_type}
- Severity: ${analysis.severity_score}/10
- Confidence: ${analysis.confidence}

## Visual Observations
${analysis.visual_observations.map((o) => `- ${o}`).join("\n")}

## Left Side Observations
${analysis.left_side_observations.map((o) => `- ${o}`).join("\n")}

## Right Side Observations
${analysis.right_side_observations.map((o) => `- ${o}`).join("\n")}

## Asymmetries
${analysis.asymmetries.map((o) => `- ${o}`).join("\n")}

## Postural Issues
${analysis.postural_issues.map((o) => `- ${o}`).join("\n")}

Based on these observations, provide a personalized corrective exercise plan as a JSON object.`;
}

// ---------------------------------------------------------------------------
// Exercise-specific form analysis prompts
// ---------------------------------------------------------------------------

/**
 * Builds a VLM prompt specifically for analyzing a user performing a named exercise.
 */
export function buildExerciseFormVLMPrompt(
  exerciseName: string,
  exerciseInstructions: string[],
  exerciseFormTips: string[],
  duration: number,
  frameCount: number,
): string {
  const instructionsList = exerciseInstructions.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const tipsList = exerciseFormTips.map((s) => `- ${s}`).join("\n");

  return `These ${frameCount} frames are from a ${duration.toFixed(1)}s video of a person performing the exercise "${exerciseName}".

## Correct Form Reference
Instructions:
${instructionsList}

Form tips:
${tipsList}

## Your Task
Evaluate how well the person is performing this exercise. For each frame, compare their form against the correct technique above.

Answer YES or NO for each:
1. Is the person performing the correct exercise (${exerciseName})? YES/NO
2. Is their body alignment correct per the instructions? YES/NO
3. Are they achieving the proper range of motion for this exercise? YES/NO
4. Is the movement controlled and at appropriate tempo? YES/NO
5. Are there any compensatory movements (shifting, rotating, arching)? YES/NO
6. Are the form tips being followed? YES/NO

Classification:
- If form is good overall (mostly YES for 1-4,6 and NO for 5) → "good_form"
- If alignment issues present → "alignment_issues"
- If range of motion is limited → "limited_rom"
- If compensatory movements dominate → "compensation"
- If exercise is wrong or unrecognizable → "wrong_exercise"

Return ONLY this JSON:
{"gait_type":"<classification>","severity_score":<0-10 where 0 is perfect form and 10 is very poor>,"visual_observations":["<what you saw about their form>"],"left_side_observations":["<left side form details>"],"right_side_observations":["<right side form details>"],"asymmetries":["<left vs right differences>"],"postural_issues":["<alignment and compensation issues>"],"confidence":"<high|medium|low>"}`;
}

/**
 * System prompt for exercise-specific form analysis.
 */
export function getExerciseFormVLMSystemPrompt(exerciseName: string): string {
  return `You are an expert physical therapist and exercise form analyst. You evaluate how well a patient performs the exercise "${exerciseName}" by comparing their movement to correct technique. Be specific about what they're doing well and what needs correction. Respond with ONLY a valid JSON object.`;
}

/**
 * Coaching system prompt for exercise form feedback.
 */
export function getExerciseFormCoachingSystemPrompt(exerciseName: string): string {
  return `You are an expert physical therapist reviewing a patient's form on the exercise "${exerciseName}". You receive structured observations from a vision AI system about their technique.

Your role:
1. Summarize how well they performed the exercise.
2. Identify the key form corrections needed.
3. Suggest cues or modifications to improve their technique.

Guidelines:
- Be encouraging — acknowledge what they did well before corrections.
- Be CONCISE. Keep explanations to 1-2 sentences.
- Keep likely_causes to 2-3 items (these are form issues, not medical causes).
- Keep warning_signs to 3 items (movements that could cause injury).
- The immediate_tip should be the single most important form cue.

Exercises are provided separately. You ONLY need to generate the text summary.

Respond with a JSON object matching this exact structure:
{
  "explanation": "<1-2 sentence summary of their form quality>",
  "likely_causes": ["<2-3 form issues to correct>"],
  "timeline": "<1 sentence on how quickly form can improve with practice>",
  "warning_signs": ["<3 form errors that could lead to injury>"],
  "immediate_tip": "<1 sentence — the single most important form cue>"
}

Return ONLY the JSON object, no additional text.`;
}

/**
 * Builds coaching user prompt for exercise form analysis.
 */
export function buildExerciseFormCoachingUserPrompt(
  analysis: NvidiaVLMAnalysis,
  exerciseName: string,
): string {
  return `Here are the form analysis observations for a patient performing "${exerciseName}". Please provide feedback on their technique.

## Form Classification
- Quality: ${analysis.gait_type.replace(/_/g, " ")}
- Severity of issues: ${analysis.severity_score}/10
- Confidence: ${analysis.confidence}

## Visual Observations
${analysis.visual_observations.map((o) => `- ${o}`).join("\n")}

## Left Side Observations
${analysis.left_side_observations.map((o) => `- ${o}`).join("\n")}

## Right Side Observations
${analysis.right_side_observations.map((o) => `- ${o}`).join("\n")}

## Asymmetries
${analysis.asymmetries.map((o) => `- ${o}`).join("\n")}

## Postural / Alignment Issues
${analysis.postural_issues.map((o) => `- ${o}`).join("\n")}

Based on these observations, provide form feedback as a JSON object.`;
}
