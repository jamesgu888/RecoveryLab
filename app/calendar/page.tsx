"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import MonthView from "@/components/calendar/month-view";
import { Button } from "@/components/ui/button";
import { requestCalendarAccess } from "@/lib/calendar-auth";
import {
  saveCalendarToken,
  getCalendarToken,
  isTokenExpired,
} from "@/lib/calendar-store";
import type { CalendarEvent } from "@/types/calendar";
import {
  ExerciseIllustration,
  getExerciseCategoryLabel,
} from "@/lib/exercise-images";
import Link from "next/link";
import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Clock,
  Trash2,
  Dumbbell,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const ACCENT_COLORS = [
  { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
];

function cleanSummary(summary: string): string {
  return summary.replace(/^[\u{1F3CB}\u{FE0F}\u{200D}\u{2640}\u{2642}\u{1F3CB}️‍♀️🏋️‍♂️🏋️\s]+/u, "").trim();
}

/** Parse structured data from event description */
function parseDescription(desc: string): {
  instructions: string[];
  setsReps: string | null;
  frequency: string | null;
} {
  const instructions: string[] = [];
  let setsReps: string | null = null;
  let frequency: string | null = null;

  if (!desc) return { instructions, setsReps, frequency };

  const lines = desc.split("\n");
  let inInstructions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "Instructions:") {
      inInstructions = true;
      continue;
    }
    if (inInstructions) {
      const match = trimmed.match(/^\d+\.\s*(.+)/);
      if (match) {
        instructions.push(match[1]);
      } else if (trimmed === "") {
        inInstructions = false;
      }
    }
    if (trimmed.startsWith("Sets/Reps:")) {
      setsReps = trimmed.replace("Sets/Reps:", "").trim();
    }
    if (trimmed.startsWith("Frequency:")) {
      frequency = trimmed.replace("Frequency:", "").trim();
    }
  }

  return { instructions, setsReps, frequency };
}

export default function CalendarPage() {
  const { user, loading, hasCalendarAccess, setCalendarAccess } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    setLoadingEvents(true);
    setError(null);

    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    try {
      const res = await fetch(
        `/api/calendar/events?user_id=${user.uid}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      const data = await res.json();

      if (data.needs_reauth) {
        setCalendarAccess(false);
        setEvents([]);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [user, year, month, setCalendarAccess]);

  useEffect(() => {
    if (user && hasCalendarAccess) {
      fetchEvents();
    }
  }, [user, hasCalendarAccess, fetchEvents]);

  const handleConnect = async () => {
    if (!user) return;
    setConnectingCalendar(true);
    setError(null);

    try {
      const { accessToken, expiresIn } = await requestCalendarAccess();
      await saveCalendarToken(user.uid, accessToken, expiresIn);
      setCalendarAccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect calendar"
      );
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setDeleting(true);

    try {
      const res = await fetch("/api/calendar/delete-exercises", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid }),
      });
      const data = await res.json();

      if (data.needs_reauth) {
        setCalendarAccess(false);
        setShowDeleteModal(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to delete events");
      }

      setEvents([]);
      setShowDeleteModal(false);
      setSelectedDate(null);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete events");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(null);
  };

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Events for the selected day
  const selectedEvents = selectedDate
    ? events.filter((ev) => ev.start.startsWith(selectedDate))
    : [];

  // Stats
  const uniqueExercises = new Set(events.map((e) => cleanSummary(e.summary)));
  const daysWithEvents = new Set(events.map((e) => e.start.slice(0, 10))).size;

  // Color map for legend + detail cards
  const colorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const ev of events) {
      const name = cleanSummary(ev.summary);
      if (!map.has(name)) {
        map.set(name, idx % ACCENT_COLORS.length);
        idx++;
      }
    }
    return map;
  }, [events]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1DB3FB] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafb]">
      <Header solid />
      <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto w-full max-w-[1100px]">
          {/* Page header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="h2-style text-[#202020]">
                Exercise <span className="text-gradient">Calendar</span>
              </h1>
              <p className="mt-2 text-sm text-[rgba(32,32,32,0.55)]">
                View and manage your scheduled exercise events.
              </p>
            </div>
            {hasCalendarAccess && (
              <div className="flex flex-wrap items-center gap-2 self-start">
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(32,32,32,0.08)] bg-white px-3.5 py-1.5 text-sm font-semibold text-[rgba(32,32,32,0.6)] shadow-sm transition-colors hover:border-[rgba(32,32,32,0.15)] hover:text-[#202020]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google Calendar
                </a>
                {events.length > 0 && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-white px-3.5 py-1.5 text-sm font-semibold text-red-500 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Not connected state */}
          {!hasCalendarAccess ? (
            <div className="flex flex-col items-center rounded-2xl border border-[rgba(32,32,32,0.06)] bg-white px-6 py-20 text-center shadow-sm">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-[#E0F5FF] to-white shadow-[0_4px_16px_rgba(29,179,251,0.1)]">
                <Calendar className="h-10 w-10 text-[#1DB3FB]" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-[#202020]">
                Connect Google Calendar
              </h2>
              <p className="mb-8 max-w-sm text-sm leading-[170%] text-[rgba(32,32,32,0.55)]">
                Sync your exercise plans directly to Google Calendar. Get reminders and stay on track with your recovery.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                variant="modern-primary"
                size="modern-xl"
                onClick={handleConnect}
                disabled={connectingCalendar}
                className="gap-2"
              >
                {connectingCalendar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Connect Calendar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Month navigation + stats */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="rounded-lg p-2 text-[rgba(32,32,32,0.5)] transition-colors hover:bg-white hover:text-[#202020]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="min-w-[160px] text-center text-lg font-bold tracking-[-0.02em] text-[#202020]">
                    {monthName}
                  </h2>
                  <button
                    onClick={nextMonth}
                    className="rounded-lg p-2 text-[rgba(32,32,32,0.5)] transition-colors hover:bg-white hover:text-[#202020]"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {/* Inline stats */}
                  {events.length > 0 && (
                    <div className="hidden items-center gap-3 text-[12px] sm:flex">
                      <span className="text-[rgba(32,32,32,0.4)]"><span className="font-bold text-[#202020]">{events.length}</span> sessions</span>
                      <span className="text-[rgba(32,32,32,0.15)]">&middot;</span>
                      <span className="text-[rgba(32,32,32,0.4)]"><span className="font-bold text-[#202020]">{uniqueExercises.size}</span> exercises</span>
                      <span className="text-[rgba(32,32,32,0.15)]">&middot;</span>
                      <span className="text-[rgba(32,32,32,0.4)]"><span className="font-bold text-[#202020]">{daysWithEvents}</span> days</span>
                    </div>
                  )}
                  <div className="h-4 w-px bg-[rgba(32,32,32,0.08)] hidden sm:block" />
                  <Button
                    variant="modern-outline"
                    size="modern-sm"
                    onClick={goToday}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <button
                    onClick={fetchEvents}
                    disabled={loadingEvents}
                    className="rounded-lg p-2 text-[rgba(32,32,32,0.4)] transition-colors hover:bg-white hover:text-[#202020] disabled:opacity-50"
                    title="Refresh events"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingEvents ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Calendar grid */}
              <div className="overflow-hidden rounded-2xl border border-[rgba(32,32,32,0.06)] bg-white shadow-sm">
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1DB3FB]" />
                  </div>
                ) : (
                  <MonthView
                    year={year}
                    month={month}
                    events={events}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                )}
              </div>

              {/* Empty state */}
              {!loadingEvents && events.length === 0 && !selectedDate && (
                <div className="mt-6 rounded-xl border border-dashed border-[rgba(32,32,32,0.1)] bg-white py-12 text-center">
                  <Dumbbell className="mx-auto mb-3 h-8 w-8 text-[rgba(32,32,32,0.15)]" />
                  <p className="text-sm font-medium text-[rgba(32,32,32,0.4)]">
                    No exercise events this month.
                  </p>
                  <p className="mt-1 text-xs text-[rgba(32,32,32,0.3)]">
                    Run a gait analysis and click &ldquo;Add to Calendar&rdquo; to schedule exercises.
                  </p>
                </div>
              )}

              {/* Selected day details */}
              {selectedDate && (
                <div className="mt-6 rounded-xl border border-[rgba(32,32,32,0.06)] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[rgba(32,32,32,0.06)] px-5 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#202020]">
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { weekday: "long", month: "long", day: "numeric" }
                        )}
                      </h3>
                      <p className="text-[11px] text-[rgba(32,32,32,0.4)]">
                        {selectedEvents.length} exercise{selectedEvents.length !== 1 ? "s" : ""} scheduled
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="rounded-full p-1 text-[rgba(32,32,32,0.3)] hover:bg-gray-100 hover:text-[#202020]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {selectedEvents.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-xs text-[rgba(32,32,32,0.35)]">
                        No exercises on this day.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[rgba(32,32,32,0.04)]">
                      {selectedEvents.map((ev) => {
                        const name = cleanSummary(ev.summary);
                        const colorIdx = colorMap.get(name) ?? 0;
                        const color = ACCENT_COLORS[colorIdx];
                        const parsed = parseDescription(ev.description);
                        return (
                          <div key={ev.id} className="group/item px-5 py-4">
                            {/* Header row */}
                            <div className="flex items-start gap-3">
                              <ExerciseIllustration
                                name={name}
                                className="h-14 w-14 shrink-0"
                              />
                              <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-semibold text-[#202020] leading-tight">
                                    {name}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-block rounded-full bg-[rgba(32,32,32,0.04)] px-2 py-0.5 text-[10px] font-medium text-[rgba(32,32,32,0.45)]">
                                      {getExerciseCategoryLabel(name)}
                                    </span>
                                    {parsed.setsReps && (
                                      <span className="inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600">
                                        {parsed.setsReps}
                                      </span>
                                    )}
                                    {parsed.frequency && (
                                      <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                                        {parsed.frequency}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[rgba(32,32,32,0.45)]">
                                    <Clock className="h-3 w-3" />
                                    {new Date(ev.start).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                    {" \u2013 "}
                                    {new Date(ev.end).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Link
                                    href={`/analyze?exercise=${encodeURIComponent(name)}${parsed.instructions.length > 0 ? `&instructions=${encodeURIComponent(parsed.instructions.join("|"))}` : ""}${parsed.setsReps ? `&sets_reps=${encodeURIComponent(parsed.setsReps)}` : ""}${parsed.frequency ? `&frequency=${encodeURIComponent(parsed.frequency)}` : ""}`}
                                  >
                                    <Button
                                      variant="modern-outline"
                                      size="modern-lg"
                                      className="gap-2"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      Analyze My Form
                                    </Button>
                                  </Link>
                                  {ev.htmlLink && (
                                    <a
                                      href={ev.htmlLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 rounded-md p-1 text-[rgba(32,32,32,0.25)] transition-all hover:bg-[#E0F5FF]/50 hover:text-[#1DB3FB]"
                                      title="Open in Google Calendar"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Instructions — aligned with text, not the icon */}
                            {parsed.instructions.length > 0 && (
                              <div className="mt-2.5 space-y-1.5 pl-[68px]">
                                {parsed.instructions.map((inst, j) => (
                                  <div key={j} className="flex items-start gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(32,32,32,0.05)] text-[9px] font-bold text-[rgba(32,32,32,0.4)]">
                                      {j + 1}
                                    </span>
                                    <p className="text-[12px] leading-[160%] text-[rgba(32,32,32,0.6)]">
                                      {inst}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete confirmation modal */}
      {mounted && showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[rgba(32,32,32,0.08)] bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="absolute right-4 top-4 rounded-full p-1 text-[rgba(32,32,32,0.4)] hover:bg-gray-100 hover:text-[#202020] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[#202020]">Delete All Exercises</h3>
            </div>

            <p className="mb-6 text-sm leading-[170%] text-[rgba(32,32,32,0.65)]">
              This will permanently delete all GaitGuard exercise events from your Google Calendar. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button
                variant="modern-outline"
                size="modern-lg"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="modern-primary"
                size="modern-lg"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 gap-2 border-red-700 bg-red-600 shadow-none hover:bg-red-700 [background-image:none]"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
