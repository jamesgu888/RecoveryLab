"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import { getAnalysesForUser, type StoredAnalysis } from "@/lib/analyses-store";
import { getEventsForPatients } from "@/lib/recoverai/store";
import { signOut } from "@/lib/firebase-auth";
import type { PatientEvent } from "@/types/recoverai";
import {
  Activity,
  Calendar,
  ArrowRight,
  LogOut,
  Plus,
  MessageSquare,
  Video,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

/* ─── Helpers ─── */

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ─── Sub-components ─── */

function SeverityBadge({ score }: { score: number }) {
  let bg = "bg-green-100 text-green-700";
  let label = "Mild";
  if (score >= 7) {
    bg = "bg-red-100 text-red-700";
    label = "Severe";
  } else if (score >= 4) {
    bg = "bg-yellow-100 text-yellow-700";
    label = "Moderate";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg}`}
    >
      {label} ({score}/10)
    </span>
  );
}

function AnalysisCard({ analysis }: { analysis: StoredAnalysis }) {
  const observations =
    analysis.visual_analysis.visual_observations || [];
  const truncated = observations.slice(0, 2);

  return (
    <Link
      href={`/results/${analysis.id}`}
      className="group flex flex-col rounded-2xl border border-[rgba(32,32,32,0.06)] bg-white p-5 shadow-[0px_2px_8px_-2px_rgba(1,65,99,0.08)] transition-all hover:border-[rgba(32,32,32,0.12)] hover:shadow-[0px_4px_16px_-4px_rgba(1,65,99,0.12)]"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E0F5FF]">
            <Activity className="h-4 w-4 text-[#1DB3FB]" />
          </div>
          <div>
            <p className="text-sm font-bold capitalize text-[#202020]">
              {analysis.visual_analysis.gait_type.replace(/_/g, " ")} Gait
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[rgba(32,32,32,0.5)]">
              <Calendar className="h-3 w-3" />
              {formatDate(analysis.timestamp)}
            </div>
          </div>
        </div>
        <SeverityBadge score={analysis.visual_analysis.severity_score} />
      </div>

      {truncated.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {truncated.map((obs, i) => (
            <li
              key={i}
              className="line-clamp-1 text-xs leading-relaxed text-[rgba(32,32,32,0.65)]"
            >
              &bull; {obs}
            </li>
          ))}
          {observations.length > 2 && (
            <li className="text-xs text-[rgba(32,32,32,0.4)]">
              +{observations.length - 2} more observations
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#1DB3FB] transition-all group-hover:gap-2">
        View full results
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function EventIcon({ event }: { event: PatientEvent }) {
  if (event.type === "checkin") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
        <ClipboardCheck className="h-4 w-4 text-green-600" />
      </div>
    );
  }
  if (event.type === "weekly_summary") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <BarChart3 className="h-4 w-4 text-blue-600" />
      </div>
    );
  }
  if (event.type === "flag_doctor") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-4 w-4 text-red-600" />
      </div>
    );
  }
  if (event.type === "consultation" || event.source === "zingage_call") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
        <Video className="h-4 w-4 text-purple-600" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <MessageSquare className="h-4 w-4 text-gray-500" />
    </div>
  );
}

function eventTitle(event: PatientEvent): string {
  switch (event.type) {
    case "checkin":
      return event.payload?.action === "sms_reminders_enabled"
        ? "SMS Reminders Enabled"
        : "Daily Check-in";
    case "weekly_summary":
      return "Weekly Summary";
    case "flag_doctor":
      return "Flagged for Doctor";
    case "consultation":
      return "AI Consultation";
    default:
      return event.source === "zingage_call"
        ? "AI Consultation"
        : "Recovery Event";
  }
}

function eventDescription(event: PatientEvent): string {
  const p = event.payload || {};
  if (event.type === "consultation") {
    const gait = p.gait_type?.replace(/_/g, " ") || "gait";
    return `Discussed ${gait} analysis with AI recovery specialist`;
  }
  if (event.type === "checkin") {
    if (p.action === "sms_reminders_enabled") {
      return `Daily check-in reminders sent to ${p.phone || "your phone"}`;
    }
    const parts: string[] = [];
    if (p.pain !== undefined) parts.push(`Pain: ${p.pain}/10`);
    if (p.did_exercise !== undefined)
      parts.push(p.did_exercise ? "Exercised" : "No exercise");
    if (p.notes) parts.push(p.notes);
    return parts.join(" · ") || "Check-in recorded";
  }
  if (event.type === "weekly_summary") {
    const parts: string[] = [];
    if (p.adherence !== undefined) parts.push(`${p.adherence}% adherence`);
    if (p.avgPain !== undefined)
      parts.push(`Avg pain: ${p.avgPain.toFixed(1)}`);
    return parts.join(" · ") || "Summary generated";
  }
  if (event.type === "flag_doctor") {
    return p.reason || "Concerning symptoms flagged";
  }
  return p.summary || p.notes || "Activity recorded";
}

function ActivityItem({ event }: { event: PatientEvent }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <EventIcon event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#202020]">
            {eventTitle(event)}
          </p>
          <span className="shrink-0 text-xs text-[rgba(32,32,32,0.45)]">
            {formatDate(event.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[rgba(32,32,32,0.6)]">
          {eventDescription(event)}
        </p>
      </div>
    </div>
  );
}

/* ─── Empty State SVG ─── */

function EmptyStateIllustration() {
  return (
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E0F5FF]">
      <Activity className="h-7 w-7 text-[#1DB3FB]" />
    </div>
  );
}

/* ─── Main Page ─── */

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [events, setEvents] = useState<PatientEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    setFetchError(null);
    let cancelled = false;

    (async () => {
      try {
        // 1. Load analyses
        const userAnalyses = await getAnalysesForUser(user.uid);
        if (cancelled) return;
        setAnalyses(userAnalyses);

        // 2. Load recovery events linked to those analyses
        const sessionIds = userAnalyses.map((a) => a.session_id);
        if (sessionIds.length > 0) {
          const patientEvents = await getEventsForPatients(sessionIds);
          if (cancelled) return;
          setEvents(patientEvents);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : String(err);
        console.error("[GaitGuard] Dashboard fetch error:", err);
        setFetchError(msg);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1DB3FB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header solid />

      <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1100px]">
          {/* Dashboard header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#202020]">Dashboard</h1>
              <p className="mt-1 text-sm text-[rgba(32,32,32,0.6)]">
                {user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/analyze"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] px-5 text-sm font-semibold text-white shadow-[0_0_1px_3px_#494949_inset,0_6px_5px_0_rgba(0,0,0,0.55)_inset] transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Analysis
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[rgba(32,32,32,0.12)] bg-white px-4 text-sm font-medium text-[rgba(32,32,32,0.7)] transition-all hover:bg-gray-50 hover:text-[#202020] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>

          {/* Content */}
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1DB3FB] border-t-transparent" />
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <p className="mb-2 text-lg font-semibold text-red-800">
                Failed to load data
              </p>
              <p className="mb-1 text-sm text-red-600">{fetchError}</p>
              <p className="text-xs text-red-500">
                Check your Firestore security rules in the Firebase Console.
              </p>
            </div>
          ) : analyses.length === 0 && events.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(32,32,32,0.12)] bg-white/60 py-20 text-center">
              <EmptyStateIllustration />
              <h3 className="mb-2 text-lg font-bold text-[#202020]">
                No analyses yet
              </h3>
              <p className="mb-6 max-w-sm text-sm text-[rgba(32,32,32,0.6)]">
                Upload a video of yourself walking to get your first AI-powered
                gait analysis and personalized exercise plan.
              </p>
              <Link
                href="/analyze"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] px-6 text-sm font-semibold text-white shadow-[0_0_1px_3px_#494949_inset,0_6px_5px_0_rgba(0,0,0,0.55)_inset] transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Analyze Your Gait
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Gait Analyses Section */}
              {analyses.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-bold text-[#202020]">
                    Gait Analyses
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {analyses.map((analysis) => (
                      <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recovery Activity Section */}
              <section>
                <h2 className="mb-4 text-lg font-bold text-[#202020]">
                  Recovery Activity
                </h2>
                {events.length > 0 ? (
                  <div className="rounded-2xl border border-[rgba(32,32,32,0.06)] bg-white shadow-[0px_2px_8px_-2px_rgba(1,65,99,0.08)]">
                    <div className="divide-y divide-[rgba(32,32,32,0.06)] px-5">
                      {events.slice(0, 20).map((event) => (
                        <ActivityItem key={event.id} event={event} />
                      ))}
                    </div>
                    {events.length > 20 && (
                      <div className="border-t border-[rgba(32,32,32,0.06)] px-5 py-3 text-center">
                        <span className="text-xs text-[rgba(32,32,32,0.45)]">
                          Showing 20 of {events.length} events
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[rgba(32,32,32,0.1)] bg-white/60 px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-[#202020]">
                      No activity yet
                    </p>
                    <p className="mt-1 text-xs text-[rgba(32,32,32,0.5)]">
                      Start an AI consultation or enable SMS reminders from your
                      analysis results to track your recovery here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
