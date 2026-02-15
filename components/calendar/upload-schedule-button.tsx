"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X, Sparkles, Calendar, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-context";

interface UploadScheduleButtonProps {
  onScheduleAdded?: () => void;
}

export default function UploadScheduleButton({ onScheduleAdded }: UploadScheduleButtonProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [manualSchedule, setManualSchedule] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Only accept images and PDFs
      if (selectedFile.type.startsWith("image/") || selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Please upload an image or PDF file");
      }
    }
  };

  const handleProcess = async () => {
    if (!user) return;
    
    setProcessing(true);
    setError("");

    try {
      let scheduleText = "";

      if (mode === "upload" && file) {
        // Convert file to base64
        const base64 = await fileToBase64(file);
        
        // Send to AI for extraction
        const response = await fetch("/api/calendar/extract-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.uid,
            file_data: base64,
            file_type: file.type,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to extract schedule");
        }

        scheduleText = data.schedule_text;
      } else {
        scheduleText = manualSchedule;
      }

      // Parse and add to calendar
      const parseResponse = await fetch("/api/calendar/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.uid,
          schedule_text: scheduleText,
        }),
      });

      const parseData = await parseResponse.json();
      if (!parseData.success) {
        throw new Error(parseData.error || "Failed to parse schedule");
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setFile(null);
        setManualSchedule("");
        onScheduleAdded?.();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process schedule");
    } finally {
      setProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  return (
    <>
      <Button
        variant="modern-primary"
        size="modern-lg"
        onClick={() => setShowModal(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload PT Schedule
      </Button>

      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !processing && setShowModal(false)}
            />
            <div className="relative z-10 my-8 w-full max-w-2xl rounded-2xl border border-[rgba(32,32,32,0.08)] bg-white p-6 shadow-xl">
              <button
                onClick={() => !processing && setShowModal(false)}
                disabled={processing}
                className="absolute right-4 top-4 rounded-full p-1 text-[rgba(32,32,32,0.4)] hover:bg-gray-100 hover:text-[#202020] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                  <Calendar className="h-5 w-5 text-[#1DB3FB]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#202020]">Add PT Schedule</h3>
                  <p className="text-xs text-[rgba(32,32,32,0.5)]">
                    Upload a schedule or type it in manually
                  </p>
                </div>
              </div>

              {/* Mode selector */}
              <div className="mb-6 flex gap-2">
                <button
                  onClick={() => setMode("upload")}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    mode === "upload"
                      ? "border-[#1DB3FB] bg-[#E0F5FF] text-[#1DB3FB]"
                      : "border-[rgba(32,32,32,0.15)] text-[rgba(32,32,32,0.65)] hover:bg-gray-50"
                  }`}
                >
                  <Upload className="mx-auto mb-1 h-5 w-5" />
                  Upload File
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    mode === "manual"
                      ? "border-[#1DB3FB] bg-[#E0F5FF] text-[#1DB3FB]"
                      : "border-[rgba(32,32,32,0.15)] text-[rgba(32,32,32,0.65)] hover:bg-gray-50"
                  }`}
                >
                  <FileText className="mx-auto mb-1 h-5 w-5" />
                  Type Manually
                </button>
              </div>

              {mode === "upload" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#202020]">
                      Upload Schedule (Image or PDF)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="schedule-upload"
                      />
                      <label
                        htmlFor="schedule-upload"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[rgba(32,32,32,0.15)] bg-[#f8f9fa] px-6 py-8 transition-colors hover:border-[#1DB3FB] hover:bg-[#E0F5FF]/30"
                      >
                        {file ? (
                          <>
                            <FileText className="mb-2 h-8 w-8 text-[#1DB3FB]" />
                            <p className="text-sm font-medium text-[#202020]">{file.name}</p>
                            <p className="text-xs text-[rgba(32,32,32,0.5)]">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="mb-2 h-8 w-8 text-[rgba(32,32,32,0.3)]" />
                            <p className="text-sm font-medium text-[rgba(32,32,32,0.65)]">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-[rgba(32,32,32,0.4)]">
                              PNG, JPG, PDF (max 10MB)
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">AI-Powered Extraction</p>
                        <p className="text-xs">
                          Claude AI will read your PT schedule and automatically extract exercises,
                          frequencies, and timing to add to your calendar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#202020]">
                      Paste or Type Your Schedule
                    </label>
                    <textarea
                      value={manualSchedule}
                      onChange={(e) => setManualSchedule(e.target.value)}
                      placeholder="Example:
- Hip flexor stretch: 3 sets of 15 reps, daily, 9:00 AM
- Calf raises: 2 sets of 20 reps, 5x per week, 2:00 PM
- Balance exercises: 10 minutes, 3x per week, 6:00 PM"
                      rows={10}
                      className="w-full rounded-lg border border-[rgba(32,32,32,0.15)] px-3 py-2.5 text-sm text-[#202020] placeholder:text-[rgba(32,32,32,0.35)] focus:border-[#1DB3FB] focus:outline-none focus:ring-2 focus:ring-[#1DB3FB]/20"
                    />
                  </div>

                  <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">Smart Parsing</p>
                        <p className="text-xs">
                          Include exercise names, sets/reps, frequency (daily, 3x per week, etc.),
                          and preferred times. Claude AI will parse and schedule them.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  ✓ Schedule added to calendar successfully!
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button
                  variant="modern-outline"
                  size="modern-lg"
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="modern-primary"
                  size="modern-lg"
                  onClick={handleProcess}
                  disabled={processing || (mode === "upload" && !file) || (mode === "manual" && !manualSchedule.trim())}
                  className="flex-1 gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Calendar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
