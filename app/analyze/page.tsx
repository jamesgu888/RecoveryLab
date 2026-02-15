"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Header from "@/components/header";
import Footer from "@/components/footer";
import VideoUpload from "@/components/analyze/video-upload";
import AnalysisLoading from "@/components/analyze/analysis-loading";
import AnalysisResults from "@/components/analyze/analysis-results";
import DebugPanel from "@/components/analyze/debug-panel";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle } from "lucide-react";
import { extractVideoFrames } from "@/lib/extract-frames";
import { analyzeGait } from "@/app/actions/analyze-gait";
import { useAuth } from "@/components/auth-context";
import { saveAnalysis } from "@/lib/analyses-store";
import type { GaitAnalysisResponse, DebugInfo, Exercise } from "@/types/gait-analysis";
import { type ActivityType, getActivityConfig } from "@/lib/activity-types";

type PageState = "upload" | "analyzing" | "results" | "error";
type AnalysisStep = "uploading" | "analyzing" | "coaching";

export default function AnalyzePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<PageState>("upload");
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("uploading");
  const [results, setResults] = useState<GaitAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [gridPreview, setGridPreview] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>("gait");
  const [targetExercise, setTargetExercise] = useState<Exercise | null>(null);

  // Pre-fill from query params (e.g. linked from calendar)
  useEffect(() => {
    const exerciseName = searchParams.get("exercise");
    if (exerciseName) {
      const instructions = searchParams.get("instructions");
      setTargetExercise({
        name: exerciseName,
        target: "",
        instructions: instructions ? instructions.split("|") : [],
        sets_reps: searchParams.get("sets_reps") || "",
        frequency: searchParams.get("frequency") || "",
        form_tips: [],
      });
      setActivityType("strength");
    }
  }, [searchParams]);

  const handleVideoReady = useCallback(async (file: File, activity: ActivityType = "gait") => {
    setPageState("analyzing");
    setAnalysisStep("uploading");
    setResults(null);
    setErrorMessage("");
    setGridPreview(null);
    setDebugInfo(null);

    try {
      const { frames, timestamps, gridPreview: preview, duration } =
        await extractVideoFrames(file);

      setGridPreview(preview);

      // Upload frames to Vercel Blob (bypasses Vercel's 4.5MB body limit)
      console.log(`[GaitGuard] Uploading ${frames.length} frames to Vercel Blob...`);
      const blobUrls: string[] = [];
      for (let i = 0; i < frames.length; i++) {
        const base64 = frames[i].split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const file = new File([bytes], `gait-frame-${i}.jpg`, { type: "image/jpeg" });
        const form = new FormData();
        form.append("file", file);
        form.append("filename", `gait-frame-${i}.jpg`);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const { url } = await res.json();
        if (!url) throw new Error(`Failed to upload frame ${i}`);
        blobUrls.push(url);
      }
      console.log(`[GaitGuard] Uploaded ${blobUrls.length} frames to blob storage`);

      setAnalysisStep("analyzing");

      // Server action fetches images from blob, sends base64 to Claude, then cleans up
      const payload: Record<string, unknown> = { blobUrls, timestamps, duration, activityType: activity };
      if (targetExercise) {
        payload.exerciseName = targetExercise.name;
        payload.exerciseInstructions = targetExercise.instructions;
        payload.exerciseFormTips = targetExercise.form_tips;
      }
      const data = await analyzeGait(JSON.stringify(payload));

      if (data.debug) {
        setDebugInfo(data.debug);
      }

      if (!data.success) {
        throw new Error(data.error || "Analysis returned an unsuccessful result.");
      }

      setAnalysisStep("coaching");
      await new Promise((resolve) => setTimeout(resolve, 800));

      const analysisResult = data as GaitAnalysisResponse;
      setResults(analysisResult);
      setPageState("results");

      // Save to Firestore if user is authenticated
      if (user) {
        try {
          await saveAnalysis(user.uid, analysisResult);
          console.log("[GaitGuard] Analysis saved to Firestore");
        } catch (saveErr) {
          console.error("[GaitGuard] Failed to save analysis:", saveErr);
        }

        // Notify family contacts about the new analysis
        const activityLabel = getActivityConfig(activity).label;
        fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.uid,
            type: "analysis_update",
            subject: `GaitGuard: New ${activityLabel} Complete`,
            message: `A new ${activityLabel.toLowerCase()} has been completed. Type: ${analysisResult.visual_analysis.gait_type.replace(/_/g, " ")}, Severity: ${analysisResult.visual_analysis.severity_score}/10. ${analysisResult.coaching.explanation || ""}`,
          }),
        }).catch((err) =>
          console.error("[GaitGuard] Failed to send family notifications:", err)
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setPageState("error");
    }
  }, [user, activityType, targetExercise]);

  const handleRetry = useCallback(() => {
    setPageState("upload");
    setResults(null);
    setErrorMessage("");
    setAnalysisStep("uploading");
    setGridPreview(null);
    setDebugInfo(null);
    setTargetExercise(null);
  }, []);

  const handleAnalyzeExerciseForm = useCallback((exercise: Exercise) => {
    setTargetExercise(exercise);
    setActivityType("strength");
    setPageState("upload");
    setResults(null);
    setErrorMessage("");
    setAnalysisStep("uploading");
    setGridPreview(null);
    setDebugInfo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const showDebug = debugInfo || gridPreview;

  return (
    <div className="flex min-h-screen flex-col">
      <Header solid />

      <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className={cn("mx-auto", pageState === "results" ? "max-w-[1300px]" : "max-w-3xl")}>
          {pageState !== "results" && (
            <div className="fade-in mb-10 text-center">
              <h2 className="h2-style text-[#202020]">
                {targetExercise ? (
                  <>Analyze your <span className="text-gradient">{targetExercise.name}</span> form</>
                ) : (
                  <>Analyze your <span className="text-gradient">{getActivityConfig(activityType).label.toLowerCase()}</span></>
                )}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                {targetExercise
                  ? `Record yourself performing ${targetExercise.name} and our AI will evaluate your form.`
                  : "Upload a video or record one with your webcam. Our AI will analyze your movement and suggest exercises."}
              </p>
            </div>
          )}

          {pageState === "upload" && (
            <VideoUpload
              onVideoReady={handleVideoReady}
              isAnalyzing={false}
              selectedActivity={activityType}
              onActivityChange={(a) => { setActivityType(a); setTargetExercise(null); }}
              exerciseName={targetExercise?.name}
            />
          )}

          {pageState === "analyzing" && (
            <>
              <AnalysisLoading currentStep={analysisStep} activityType={activityType} exerciseName={targetExercise?.name} />
              {gridPreview && (
                <div className="mt-6 rounded-[10px] border border-orange-200 bg-orange-50/50 p-5">
                  <p className="mb-2 text-sm font-semibold text-orange-800">
                    Extracted frames (debug preview)
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gridPreview}
                    alt="Extracted frames preview"
                    className="w-full rounded border border-[rgba(32,32,32,0.1)]"
                  />
                </div>
              )}
            </>
          )}

          {pageState === "results" && results && (
            <div className="fade-in">
              <AnalysisResults data={results} onNewAnalysis={handleRetry} onAnalyzeExerciseForm={handleAnalyzeExerciseForm} />
            </div>
          )}

          {pageState === "error" && (
            <div className="fade-in">
              <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="mb-2 text-lg font-semibold text-[#202020]">
                  Analysis Failed
                </p>
                <p className="mx-auto mb-6 max-w-md text-sm leading-[140%] text-[rgba(32,32,32,0.75)]">
                  {errorMessage}
                </p>
                <Button
                  variant="modern-primary"
                  size="modern-xl"
                  className="gap-2 px-6"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {showDebug && (pageState === "error" || pageState === "results") && (
            <DebugPanel
              gridPreview={gridPreview}
              debugInfo={debugInfo}
              errorMessage={pageState === "error" ? errorMessage : undefined}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
