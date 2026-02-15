// Key frame annotation returned by the VLM (indices into the frame array)
export interface KeyFrameAnnotation {
  frame_index: number;
  annotation: string;
  body_region: string;
  x: number; // 0-100 percentage from left edge of frame
  y: number; // 0-100 percentage from top edge of frame
}

// Resolved key frame with blob URL for display
export interface StoredKeyFrame {
  url: string;
  annotation: string;
  body_region: string;
  timestamp_s: number;
  x: number; // 0-100 percentage from left edge
  y: number; // 0-100 percentage from top edge
}

// NVIDIA VLM response — structured output from visual gait analysis
export interface NvidiaVLMAnalysis {
  gait_type: string; // normal, antalgic, trendelenburg, steppage, parkinsonian, hemiplegic, scissors
  severity_score: number; // 0-10
  visual_observations: string[];
  left_side_observations: string[];
  right_side_observations: string[];
  asymmetries: string[];
  postural_issues: string[];
  confidence: "high" | "medium" | "low";
  key_frames?: KeyFrameAnnotation[];
}

// Single exercise from OpenAI coaching response
export interface Exercise {
  name: string;
  target: string;
  instructions: string[];
  sets_reps: string;
  frequency: string;
  form_tips: string[];
}

// OpenAI coaching response — full rehabilitation plan
export interface CoachingPlan {
  explanation: string;
  likely_causes: string[];
  exercises: Exercise[];
  timeline: string;
  warning_signs: string[];
  immediate_tip: string;
}

// Debug information returned alongside responses
export interface DebugInfo {
  grid_preview?: string; // truncated data URL (first 200 chars)
  grid_size_kb?: number;
  vlm_endpoint?: string;
  vlm_model?: string;
  vlm_prompt?: string;
  vlm_raw_response?: string;
  vlm_status?: number;
  vlm_duration_ms?: number;
  coaching_model?: string;
  coaching_prompt?: string;
  coaching_raw_response?: string;
  coaching_duration_ms?: number;
}

// Combined API response returned to the frontend
export interface GaitAnalysisResponse {
  success: boolean;
  session_id: string;
  timestamp: string;
  activity_type?: string; // "gait" | "stretching" | "balance" | "strength" | "range_of_motion"
  exercise_name?: string; // set when analyzing a specific exercise's form
  visual_analysis: NvidiaVLMAnalysis;
  coaching: CoachingPlan;
  key_frames?: StoredKeyFrame[];
  error?: string;
  debug?: DebugInfo;
}

// Error response returned when a pipeline stage fails
export interface GaitAnalysisError {
  success: false;
  error: string;
  stage: "upload" | "vlm_analysis" | "coaching" | "unknown";
  debug?: DebugInfo;
}
