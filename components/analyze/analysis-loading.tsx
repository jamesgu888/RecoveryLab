"use client";

import React from "react";
import { Upload, Eye, Dumbbell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/lib/activity-types";

interface AnalysisLoadingProps {
  currentStep: "uploading" | "analyzing" | "coaching";
  activityType?: ActivityType;
  exerciseName?: string;
}

const ACTIVITY_ANALYZE_LABELS: Record<string, string> = {
  gait: "Analyzing gait patterns",
  stretching: "Analyzing stretching form",
  balance: "Analyzing balance & stability",
  strength: "Analyzing exercise form",
  range_of_motion: "Analyzing range of motion",
};

const ACTIVITY_HEADER_LABELS: Record<string, string> = {
  gait: "Analyzing your gait",
  stretching: "Analyzing your stretching",
  balance: "Analyzing your balance",
  strength: "Analyzing your form",
  range_of_motion: "Analyzing your range of motion",
};

function getStepStatus(
  stepId: string,
  currentStep: string
): "completed" | "active" | "pending" {
  const order = ["uploading", "analyzing", "coaching"];
  const currentIndex = order.indexOf(currentStep);
  const stepIndex = order.indexOf(stepId);

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

export default function AnalysisLoading({ currentStep, activityType = "gait", exerciseName }: AnalysisLoadingProps) {
  const analyzeLabel = exerciseName
    ? `Analyzing ${exerciseName} form`
    : (ACTIVITY_ANALYZE_LABELS[activityType] || ACTIVITY_ANALYZE_LABELS.gait);
  const headerLabel = exerciseName
    ? `Analyzing your ${exerciseName} form`
    : (ACTIVITY_HEADER_LABELS[activityType] || ACTIVITY_HEADER_LABELS.gait);

  const steps = [
    { id: "uploading" as const, label: "Uploading video", icon: Upload },
    { id: "analyzing" as const, label: analyzeLabel, icon: Eye },
    { id: "coaching" as const, label: "Generating exercise plan", icon: Dumbbell },
  ];

  return (
    <div className="fade-in w-full">
      <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: 'rgba(32,32,32,0.1)', borderTopColor: '#1DB3FB' }}
            />
          </div>
          <p className="text-lg font-semibold text-[#202020]">
            {headerLabel}
          </p>
          <p className="mt-1 text-sm text-[rgba(32,32,32,0.5)]">
            This may take a moment
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mx-auto max-w-sm space-y-3">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id, currentStep);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-[54px] left-[35px] h-3 w-[2px] transition-colors duration-500",
                      status === "completed"
                        ? "bg-[#1DB3FB]"
                        : "bg-[rgba(32,32,32,0.08)]"
                    )}
                  />
                )}

                <div
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-500",
                    status === "active" &&
                      "bg-[rgba(29,179,251,0.04)]"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                      status === "completed" &&
                        "bg-gradient-to-r from-[#1DB3FB] to-[#00A7EF]",
                      status === "active" &&
                        "bg-gradient-to-b from-[#E0F5FF] to-white",
                      status === "pending" &&
                        "bg-[rgba(32,32,32,0.04)]"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <StepIcon
                        className={cn(
                          "h-4 w-4 transition-colors duration-500",
                          status === "active"
                            ? "text-[#1DB3FB]"
                            : "text-[rgba(32,32,32,0.3)]"
                        )}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors duration-500",
                      status === "completed" && "text-[#1DB3FB]",
                      status === "active" && "text-[#202020]",
                      status === "pending" && "text-[rgba(32,32,32,0.35)]"
                    )}
                  >
                    {step.label}
                    {status === "active" && (
                      <span className="ml-1 inline-flex">
                        <span className="animate-pulse">...</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mx-auto mt-8 max-w-sm">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(32,32,32,0.06)]">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-[#1DB3FB] to-[#00A7EF] transition-all duration-700 ease-out"
              )}
              style={{
                width:
                  currentStep === "uploading"
                    ? "20%"
                    : currentStep === "analyzing"
                      ? "55%"
                      : "85%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
