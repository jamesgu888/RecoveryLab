"use client";

import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  score: number;
  confidence: "high" | "medium" | "low";
}

function getSeverityColor(score: number) {
  if (score <= 3) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      ring: "ring-emerald-500/20",
      label: "Low",
    };
  }
  if (score <= 6) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      ring: "ring-amber-500/20",
      label: "Moderate",
    };
  }
  return {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    ring: "ring-red-500/20",
    label: "High",
  };
}

function getConfidenceLabel(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return { label: "High confidence", dot: "bg-emerald-500" };
    case "medium":
      return { label: "Medium confidence", dot: "bg-amber-500" };
    case "low":
      return { label: "Low confidence", dot: "bg-red-500" };
  }
}

export default function SeverityBadge({ score, confidence }: SeverityBadgeProps) {
  const severity = getSeverityColor(score);
  const conf = getConfidenceLabel(confidence);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex h-20 w-20 flex-col items-center justify-center rounded-full border-2",
          severity.bg,
          severity.border,
          severity.text
        )}
      >
        <span className="text-2xl font-bold leading-none">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-75">
          / 10
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
            severity.bg,
            severity.text
          )}
        >
          {severity.label} Severity
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[rgba(32,32,32,0.55)]">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", conf.dot)} />
          {conf.label}
        </span>
      </div>
    </div>
  );
}
