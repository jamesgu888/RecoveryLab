"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalysisResults from "@/components/analyze/analysis-results";
import type { GaitAnalysisResponse } from "@/types/gait-analysis";

const MOCK_DATA: GaitAnalysisResponse = {
  success: true,
  session_id: "test-preview-001",
  timestamp: new Date().toISOString(),
  visual_analysis: {
    gait_type: "scissors",
    severity_score: 6,
    visual_observations: [
      "Feet consistently land close together near midline throughout gait cycle",
      "Narrow base of support with feet appearing to cross toward midline",
      "Both legs appear to have some stiffness with limited knee flexion during swing phase",
      "Arms show limited natural swing bilaterally",
      "Person looking down at feet throughout walking sequence",
    ],
    left_side_observations: [
      "Left arm shows minimal swing, held relatively close to body",
      "Left leg appears stiff with reduced knee flexion",
      "Left foot lands close to midline",
    ],
    right_side_observations: [
      "Right arm shows minimal swing, held relatively close to body",
      "Right leg appears stiff with reduced knee flexion",
      "Right foot lands close to midline, sometimes crossing toward left",
    ],
    asymmetries: [
      "No significant asymmetry between left and right sides",
      "Both sides appear equally affected with reduced stride width",
      "Gait pattern appears relatively symmetrical",
    ],
    postural_issues: [
      "Forward head posture with eyes directed downward",
      "Slightly stooped trunk posture",
      "Reduced lumbar lordosis during walking",
    ],
    confidence: "high",
  },
  coaching: {
    explanation:
      "Your gait shows a scissors pattern characterized by narrow, crossing steps and stiff leg movement. This is often related to increased muscle tone in the hip adductors and limited hip abductor control.",
    likely_causes: [
      "Hip adductor spasticity or tightness",
      "Weak hip abductors (gluteus medius)",
      "Impaired motor control of lower extremities",
    ],
    exercises: [
      {
        name: "Seated Hip Abduction",
        target: "Hip abductors (gluteus medius)",
        instructions: [
          "Sit upright in a sturdy chair with feet flat on the floor.",
          "Place a resistance band around both knees.",
          "Slowly push knees apart against the band, hold 3 seconds.",
          "Return slowly to start position.",
        ],
        sets_reps: "3 sets of 10 reps",
        frequency: "Daily",
        form_tips: [
          "Keep back straight against chair",
          "Move slowly and with control",
        ],
      },
      {
        name: "Standing Hip Adductor Stretch",
        target: "Hip adductors (inner thigh)",
        instructions: [
          "Stand with feet wide apart, toes pointing forward.",
          "Shift weight to one side, bending that knee slightly.",
          "Feel stretch along inner thigh of the straight leg.",
          "Hold 30 seconds, then switch sides.",
        ],
        sets_reps: "3 holds of 30 seconds each side",
        frequency: "Twice daily",
        form_tips: [
          "Keep both feet flat on the floor",
          "Don't bounce — hold steady",
        ],
      },
      {
        name: "Wide-Stance Walking Drill",
        target: "Gait retraining",
        instructions: [
          "Place tape lines on the floor about hip-width apart.",
          "Practice walking with each foot landing outside its respective line.",
          "Focus on keeping feet apart throughout the gait cycle.",
          "Walk slowly for 10 meters, rest, repeat.",
        ],
        sets_reps: "5 passes of 10 meters",
        frequency: "Daily",
        form_tips: [
          "Look ahead, not at your feet",
          "Take slightly shorter steps initially",
        ],
      },
    ],
    timeline:
      "With consistent daily practice, expect noticeable improvement in stride width and walking comfort within 4-6 weeks.",
    warning_signs: [
      "Sudden worsening of stiffness or crossing",
      "New onset of numbness or tingling in legs",
      "Loss of bladder or bowel control",
    ],
    immediate_tip:
      "Try consciously widening your stance when walking — imagine walking on either side of a line rather than on it.",
  },
};

export default function TestResultsPage() {
  return (
    <>
      <Header solid />
      <main className="px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1300px]">
          <div className="fade-in">
            <AnalysisResults
              data={MOCK_DATA}
              onNewAnalysis={() => window.location.reload()}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
