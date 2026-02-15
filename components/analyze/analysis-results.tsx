"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SeverityBadge from "@/components/analyze/severity-badge";
import ExerciseCard from "@/components/analyze/exercise-card";
import type { GaitAnalysisResponse } from "@/types/gait-analysis";
import { type ActivityType, getActivityConfig } from "@/lib/activity-types";
import BodyObservationMap from "@/components/analyze/body-observation-map";
import KeyFrameGallery from "@/components/analyze/key-frame-gallery";
import { useAuth } from "@/components/auth-context";
import AddToCalendarButton from "@/components/analyze/add-to-calendar-button";
import {
  AlertTriangle,
  Clock,
  ArrowLeft,
  Move,
  Video,
  Loader2,
  MessageSquare,
  Phone,
  CheckCircle2,
  X,
} from "lucide-react";

interface AnalysisResultsProps {
  data: GaitAnalysisResponse;
  onNewAnalysis: () => void;
  onAnalyzeExerciseForm?: (exercise: import("@/types/gait-analysis").Exercise) => void;
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
  onAnalyzeExerciseForm,
}: AnalysisResultsProps) {
  const { user } = useAuth();
  const { visual_analysis, coaching, key_frames } = data;
  const isExerciseForm = !!data.exercise_name;
  const activityType = (data.activity_type || "gait") as ActivityType;
  const activityConfig = getActivityConfig(activityType);
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  // Avatar selection state
  const [avatars, setAvatars] = useState<Array<{ avatar_id: string; avatar_name: string }>>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("513fd1b7-7ef9-466d-9af2-344e51eeb833");
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  // Poke SMS state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);
  const [pokeSuccess, setPokeSuccess] = useState(false);
  const [pokeError, setPokeError] = useState<string | null>(null);

  // Modal state
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load avatars when modal opens
  useEffect(() => {
    if (showConsultationModal && avatars.length === 0 && !loadingAvatars) {
      setLoadingAvatars(true);
      fetch("/api/avatar/list")
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setAvatars(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingAvatars(false));
    }
  }, [showConsultationModal, avatars.length, loadingAvatars]);

  const handleScheduleConsultation = async () => {
    setIsCreatingConsultation(true);
    setConsultationError(null);

    try {
      const selectedAvatar = avatars.find(a => a.avatar_id === selectedAvatarId);
      
      const res = await fetch("/api/avatar/interactive-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visual_analysis: data.visual_analysis,
          coaching: data.coaching,
          session_id: data.session_id,
          user_id: user?.uid,
          avatar_id: selectedAvatarId,
          avatar_name: selectedAvatar?.avatar_name || null,
          activity_type: activityType,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create consultation session");
      }

      // Navigate to custom consultation page with all session data
      const params = new URLSearchParams({
        session_id: result.session_id,
        session_token: result.session_token,
        livekit_url: result.livekit_url,
        livekit_token: result.livekit_client_token,
        ws_url: result.ws_url || "",
        avatar_id: result.avatar_id || "",
        avatar_name: result.avatar_name || "",
        gait_context: result.gait_context,
      });
      
      window.open(`/consultation?${params.toString()}`, "_blank");
      
      setShowConsultationModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setConsultationError(message);
    } finally {
      setIsCreatingConsultation(false);
    }
  };

  const handleEnableReminders = async () => {
    if (!phoneNumber.trim()) return;

    setIsSendingCheckin(true);
    setPokeError(null);
    setPokeSuccess(false);

    try {
      const res = await fetch("/api/poke/send_daily_checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: data.session_id,
          phone_or_user_id: phoneNumber.trim(),
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to enable reminders");
      }

      setPokeSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setPokeError(message);
    } finally {
      setIsSendingCheckin(false);
    }
  };

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
        <div className="flex flex-wrap items-center gap-2 self-start">
          <Button
            variant="modern-primary"
            size="modern-lg"
            onClick={() => { setConsultationError(null); setShowConsultationModal(true); }}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            Schedule Consultation
          </Button>
          <AddToCalendarButton
            exercises={coaching.exercises}
            analysisDate={data.timestamp}
            sessionId={data.session_id}
            gaitType={visual_analysis.gait_type}
            timeline={coaching.timeline}
          />
          <Button
            variant="modern-outline"
            size="modern-lg"
            onClick={() => setShowSmsModal(true)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            SMS Reminders
          </Button>
        </div>
      </div>

      {/* ── Consultation Modal ── */}
      {mounted && showConsultationModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConsultationModal(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[rgba(32,32,32,0.08)] bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowConsultationModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-[rgba(32,32,32,0.4)] hover:bg-gray-100 hover:text-[#202020]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                <Video className="h-5 w-5 text-[#1DB3FB]" />
              </div>
              <h3 className="text-lg font-bold text-[#202020]">Schedule Consultation</h3>
            </div>

            <p className="mb-6 text-sm leading-[170%] text-[rgba(32,32,32,0.65)]">
              Start a virtual consultation to discuss your analysis results with our AI recovery specialist. The session will open in a new window.
            </p>

            {/* Avatar Selection Dropdown */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-[#202020]">
                Select Your Therapist
              </label>
              <select
                value={selectedAvatarId}
                onChange={(e) => setSelectedAvatarId(e.target.value)}
                disabled={loadingAvatars}
                className="w-full rounded-lg border border-[rgba(32,32,32,0.12)] bg-white px-4 py-2.5 text-sm text-[#202020] transition-colors hover:border-[#1DB3FB] focus:border-[#1DB3FB] focus:outline-none focus:ring-2 focus:ring-[#1DB3FB]/20 disabled:opacity-50"
              >
                {loadingAvatars ? (
                  <option>Loading avatars...</option>
                ) : avatars.length > 0 ? (
                  avatars.map((avatar) => (
                    <option key={avatar.avatar_id} value={avatar.avatar_id}>
                      {avatar.avatar_name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="513fd1b7-7ef9-466d-9af2-344e51eeb833">Ann - Physical Therapist</option>
                    <option value="7b888024-f8c9-4205-95e1-78ce01497bda">Shawn - Physical Therapist</option>
                    <option value="55eec60c-d665-4972-a529-bbdcaf665ab8">Bryan - Fitness Coach</option>
                  </>
                )}
              </select>
            </div>

            {consultationError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Error:</strong> {consultationError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="modern-outline"
                size="modern-lg"
                onClick={() => setShowConsultationModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="modern-primary"
                size="modern-lg"
                onClick={handleScheduleConsultation}
                disabled={isCreatingConsultation}
                className="flex-1 gap-2"
              >
                {isCreatingConsultation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Start Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── SMS Reminders Modal ── */}
      {mounted && showSmsModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSmsModal(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[rgba(32,32,32,0.08)] bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowSmsModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-[rgba(32,32,32,0.4)] hover:bg-gray-100 hover:text-[#202020]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0FFE8] to-white">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-[#202020]">SMS Reminders</h3>
            </div>

            <p className="mb-6 text-sm leading-[170%] text-[rgba(32,32,32,0.65)]">
              Get daily check-in reminders via text to track your pain levels, exercise completion, and recovery progress.
            </p>

            {pokeSuccess ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Reminders enabled!</p>
                  <p className="text-sm text-green-700">
                    You&apos;ll receive check-in SMS at{" "}
                    <span className="font-medium">{phoneNumber}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="phone-number" className="mb-1.5 block text-sm font-semibold text-[#202020]">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(32,32,32,0.35)]" />
                    <input
                      id="phone-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (512) 363-8422"
                      className="w-full rounded-lg border border-[rgba(32,32,32,0.15)] py-2.5 pl-10 pr-4 text-sm text-[#202020] placeholder:text-[rgba(32,32,32,0.35)] focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    />
                  </div>
                </div>

                {pokeError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <strong>Error:</strong> {pokeError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="modern-outline"
                    size="modern-lg"
                    onClick={() => setShowSmsModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="modern-primary"
                    size="modern-lg"
                    onClick={handleEnableReminders}
                    disabled={isSendingCheckin || !phoneNumber.trim()}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700 border-green-700 shadow-none [background-image:none]"
                  >
                    {isSendingCheckin ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        Enable Reminders
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ──────────────────────────────────────────────────────────────────
          B) Overview Row
      ────────────────────────────────────────────────────────────────── */}
      <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          {/* Gait type */}
          <div className="flex-1 text-center sm:text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgba(32,32,32,0.45)]">
              {activityType === "gait" ? "Detected Movement Pattern" : `${activityConfig.label} Results`}
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

          {key_frames && key_frames.length > 0 && (
            <KeyFrameGallery keyFrames={key_frames} />
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <h3 className="h2-style text-[#202020]">
            <span className="text-gradient">{isExerciseForm ? "How to Improve" : "Your Exercise Plan"}</span>
          </h3>

          {/* Exercise cards — only for general analysis */}
          {!isExerciseForm && coaching.exercises.length > 0 && (
            <div className="space-y-4">
              {coaching.exercises.map((exercise, i) => (
                <ExerciseCard key={i} exercise={exercise} index={i} onAnalyzeForm={onAnalyzeExerciseForm} />
              ))}
            </div>
          )}

          {/* Immediate tip — shown prominently for exercise form analysis */}
          {isExerciseForm && coaching.immediate_tip && (
            <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                  <Move className="h-4 w-4 text-[#1DB3FB]" />
                </div>
                <h4 className="text-sm font-bold tracking-[-0.01rem] text-[#202020]">
                  Quick Tip
                </h4>
              </div>
              <p className="text-sm leading-[170%] text-[rgba(32,32,32,0.75)]">
                {coaching.immediate_tip}
              </p>
            </div>
          )}

          {/* Likely Causes + Postural Issues */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {coaching.likely_causes.length > 0 && (
              <ObservationCard
                title={isExerciseForm ? "Form Issues" : "Likely Causes"}
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
          New Analysis + Disclaimer Footer
      ────────────────────────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <Button
          variant="modern-outline"
          size="modern-lg"
          onClick={onNewAnalysis}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          New Analysis
        </Button>
      </div>
      <div className="border-t border-[rgba(32,32,32,0.06)] pt-6 pb-4 text-center">
        <p className="text-xs leading-[170%] text-[rgba(32,32,32,0.4)]">
          This analysis is for informational purposes only. Please consult a
          healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
