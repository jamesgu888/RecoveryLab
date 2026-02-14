"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SeverityBadge from "@/components/analyze/severity-badge";
import ExerciseCard from "@/components/analyze/exercise-card";
import type { GaitAnalysisResponse } from "@/types/gait-analysis";
import {
  AlertTriangle,
  Clock,
  Eye,
  ArrowLeft,
  Lightbulb,
  User,
  ArrowLeftRight,
  Move,
  Video,
  Loader2,
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
                variant === "warning" ? "bg-amber-500" : "bg-[#1DA1F2]"
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
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);
  const [consultationUrl, setConsultationUrl] = useState<string | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  const handleScheduleConsultation = async () => {
    setIsCreatingConsultation(true);
    setConsultationError(null);

    try {
      // Create avatar session with the analysis results
      const res = await fetch("/api/avatar/interactive-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gait_analysis: data,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create consultation session");
      }

      // Open LiveKit room with the avatar
      const url = `https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(result.livekit_url)}&token=${encodeURIComponent(result.livekit_client_token)}`;
      setConsultationUrl(url);
      window.open(url, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setConsultationError(message);
    } finally {
      setIsCreatingConsultation(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-10">
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
          C) Visual Analysis Section
      ────────────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-6 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
          <span className="text-gradient">Visual Analysis</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ObservationCard
            title="Visual Observations"
            icon={<Eye className="h-4 w-4 text-[#1DA1F2]" />}
            items={visual_analysis.visual_observations}
          />
          <ObservationCard
            title="Left Side"
            icon={<User className="h-4 w-4 text-[#1DA1F2]" />}
            items={visual_analysis.left_side_observations}
          />
          <ObservationCard
            title="Right Side"
            icon={<User className="h-4 w-4 text-[#1DA1F2]" />}
            items={visual_analysis.right_side_observations}
          />
          <ObservationCard
            title="Asymmetries"
            icon={<ArrowLeftRight className="h-4 w-4 text-amber-500" />}
            items={visual_analysis.asymmetries}
            variant="warning"
          />
          <ObservationCard
            title="Postural Issues"
            icon={<Move className="h-4 w-4 text-amber-500" />}
            items={visual_analysis.postural_issues}
            variant="warning"
          />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          D) Coaching Section
      ────────────────────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <h3 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">
          <span className="text-gradient">Your Exercise Plan</span>
        </h3>

        {/* Explanation */}
        <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5 sm:p-6">
          <p className="text-base leading-[170%] text-[rgba(32,32,32,0.75)]">
            {coaching.explanation}
          </p>
        </div>

        {/* Likely causes */}
        {coaching.likely_causes.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[rgba(32,32,32,0.45)]">
              Likely Causes
            </h4>
            <ul className="space-y-2">
              {coaching.likely_causes.map((cause, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-[160%] text-[rgba(32,32,32,0.75)]"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(32,32,32,0.25)]" />
                  {cause}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Immediate tip - blue callout */}
        {coaching.immediate_tip && (
          <div className="rounded-[10px] bg-gradient-to-b from-[#E0F5FF] to-white border border-[rgba(29,161,242,0.15)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)]">
                <Lightbulb className="h-4 w-4 text-[#1DA1F2]" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#1DA1F2]">
                  Immediate Tip
                </p>
                <p className="text-sm leading-[170%] text-[rgba(32,32,32,0.75)]">
                  {coaching.immediate_tip}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {coaching.exercises.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[rgba(32,32,32,0.45)]">
              Exercises ({coaching.exercises.length})
            </h4>
            {coaching.exercises.map((exercise, i) => (
              <ExerciseCard key={i} exercise={exercise} index={i} />
            ))}
          </div>
        )}

        {/* Timeline */}
        {coaching.timeline && (
          <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                <Clock className="h-4 w-4 text-[#1DA1F2]" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgba(32,32,32,0.45)]">
                  Expected Timeline
                </p>
                <p className="text-sm leading-[170%] text-[rgba(32,32,32,0.75)]">
                  {coaching.timeline}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning signs - red callout */}
        {coaching.warning_signs.length > 0 && (
          <div className="rounded-[10px] bg-gradient-to-b from-red-50 to-white border border-red-100 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)]">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-600">
                  Warning Signs
                </p>
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
            </div>
          </div>
        )}

        {/* Schedule Consultation */}
        <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6 sm:p-8 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)]">
              <Video className="h-6 w-6 text-[#1DA1F2]" />
            </div>
            <div className="flex-1">
              <h4 className="mb-1 text-lg font-bold tracking-[-0.01rem] text-[#202020]">
                Have Questions or Concerns?
              </h4>
              <p className="text-sm leading-[160%] text-[rgba(32,32,32,0.65)]">
                Schedule a virtual consultation to discuss your analysis results with our AI recovery specialist
              </p>
            </div>
            <Button
              variant="modern-primary"
              size="modern-xl"
              onClick={handleScheduleConsultation}
              disabled={isCreatingConsultation}
              className="gap-2 px-6 shrink-0"
            >
              {isCreatingConsultation ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Video className="h-5 w-5" />
                  Schedule Consultation
                </>
              )}
            </Button>
          </div>
          {consultationError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <strong>Error:</strong> {consultationError}
            </div>
          )}
          {consultationUrl && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✓ Consultation session opened in a new window. If it didn't open,{" "}
              <a href={consultationUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                click here
              </a>
            </div>
          )}
        </div>
      </section>

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
