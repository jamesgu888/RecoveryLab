"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SeverityBadge from "@/components/analyze/severity-badge";
import ExerciseCard from "@/components/analyze/exercise-card";
import type { GaitAnalysisResponse } from "@/types/gait-analysis";
import BodyObservationMap from "@/components/analyze/body-observation-map";
import {
  AlertTriangle,
  Clock,
  ArrowLeft,
  Move,
} from "lucide-react";

interface AnalysisResultsProps {
  data: GaitAnalysisResponse;
  onNewAnalysis: () => void;
}

/** Converts "antalgic_gait" -> "Antalgic Gait" */
function formatGaitType(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Format ISO timestamp into a readable date/time string */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Reusable observation card used in the Visual Analysis grid */
function ObservationCard({
  title,
  icon,
  items,
  variant = "default",
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  variant?: "default" | "warning";
}) {
  if (items.length === 0) return null;

  return (
    <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            variant === "warning"
              ? "bg-amber-50"
              : "bg-gradient-to-b from-[#E0F5FF] to-white"
          )}
        >
          {icon}
        </div>
        <h4 className="text-sm font-bold tracking-[-0.01rem] text-[#202020]">
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm leading-[160%] text-[rgba(32,32,32,0.75)]"
          >
            <span
              className={cn(
                "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                variant === "warning" ? "bg-amber-500" : "bg-[#1DB3FB]"
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalysisResults({
  data,
  onNewAnalysis,
}: AnalysisResultsProps) {
  const { visual_analysis, coaching } = data;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10">
      {/* ──────────────────────────────────────────────────────────────────
          A) Header Area
      ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h2-style text-[#202020]">
            Analysis <span className="text-gradient">Complete</span>
          </h2>
          <p className="mt-2 text-sm text-[rgba(32,32,32,0.55)]">
            Session {data.session_id} &middot; {formatTimestamp(data.timestamp)}
          </p>
        </div>
        <Button
          variant="modern-outline"
          size="modern-lg"
          onClick={onNewAnalysis}
          className="gap-2 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          New Analysis
        </Button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          B) Overview Row
      ────────────────────────────────────────────────────────────────── */}
      <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          {/* Gait type */}
          <div className="flex-1 text-center sm:text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgba(32,32,32,0.45)]">
              Detected Gait Pattern
            </p>
            <p className="text-2xl font-bold tracking-[-0.03em] text-[#202020] sm:text-3xl">
              {formatGaitType(visual_analysis.gait_type)}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden h-20 w-px bg-[rgba(32,32,32,0.08)] sm:block" />

          {/* Severity badge */}
          <SeverityBadge
            score={visual_analysis.severity_score}
            confidence={visual_analysis.confidence}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          C) Two-column layout: Analysis + Exercises
      ────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
        {/* LEFT COLUMN — Visual Analysis + Coaching Summary */}
        <div className="space-y-6">
          <h3 className="h2-style text-[#202020]">
            <span className="text-gradient">Visual Analysis</span>
          </h3>

          {/* Explanation */}
          <p className="text-base leading-[170%] text-[rgba(32,32,32,0.75)] sm:text-lg">
            {coaching.explanation}
          </p>

          <BodyObservationMap visual_analysis={visual_analysis} />

          {/* Likely Causes + Postural Issues side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {coaching.likely_causes.length > 0 && (
              <ObservationCard
                title="Likely Causes"
                icon={<Move className="h-4 w-4 text-amber-500" />}
                items={coaching.likely_causes}
                variant="warning"
              />
            )}
            {visual_analysis.postural_issues.length > 0 && (
              <ObservationCard
                title="Postural Issues"
                icon={<Move className="h-4 w-4 text-amber-500" />}
                items={visual_analysis.postural_issues}
                variant="warning"
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Exercises + Timeline + Warnings */}
        <div className="space-y-6">
          <h3 className="h2-style text-[#202020]">
            <span className="text-gradient">Your Exercise Plan</span>
          </h3>

          {/* Exercise cards */}
          {coaching.exercises.length > 0 && (
            <div className="space-y-4">
              {coaching.exercises.map((exercise, i) => (
                <ExerciseCard key={i} exercise={exercise} index={i} />
              ))}
            </div>
          )}

          {/* Timeline + Warning signs side by side */}
          {(coaching.timeline || coaching.warning_signs.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {coaching.timeline && (
                <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1DB3FB]" />
                    <p className="text-sm font-semibold text-[#202020]">
                      Expected Timeline
                    </p>
                  </div>
                  <p className="text-sm leading-[170%] text-[rgba(32,32,32,0.75)]">
                    {coaching.timeline}
                  </p>
                </div>
              )}

              {coaching.warning_signs.length > 0 && (
                <div className="rounded-[10px] border border-red-100 bg-red-50/50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-semibold text-red-600">
                      Warning Signs
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {coaching.warning_signs.map((sign, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm leading-[160%] text-[rgba(32,32,32,0.75)]"
                      >
                        <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        {sign}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          E) Disclaimer Footer
      ────────────────────────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(32,32,32,0.06)] pt-6 pb-4 text-center">
        <p className="text-xs leading-[170%] text-[rgba(32,32,32,0.4)]">
          This analysis is for informational purposes only. Please consult a
          healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
