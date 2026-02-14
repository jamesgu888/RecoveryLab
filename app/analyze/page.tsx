"use client";

import React, { useState, useCallback } from "react";
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
import type { GaitAnalysisResponse, DebugInfo } from "@/types/gait-analysis";

type PageState = "upload" | "analyzing" | "results" | "error";
type AnalysisStep = "uploading" | "analyzing" | "coaching";

export default function AnalyzePage() {
  const [pageState, setPageState] = useState<PageState>("upload");
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("uploading");
  const [results, setResults] = useState<GaitAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [gridPreview, setGridPreview] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const handleVideoReady = useCallback(async (file: File) => {
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
      setAnalysisStep("analyzing");

      // Send individual frames + timestamps as JSON
      console.log(`[GaitGuard] Sending ${frames.length} frames to API...`);
      const res = await fetch("/api/analyze-gait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frames,
          timestamps,
          duration,
        }),
      });

      console.log(`[GaitGuard] API responded with status ${res.status}`);

      const text = await res.text();
      console.log(`[GaitGuard] Response body length: ${text.length}`);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("[GaitGuard] Failed to parse response JSON:", parseErr);
        throw new Error("Failed to parse analysis response");
      }

      if (data.debug) {
        setDebugInfo(data.debug);
      }

      if (!res.ok) {
        throw new Error(
          data?.error || `Analysis failed with status ${res.status}`
        );
      }

      if (!data.success) {
        throw new Error(data.error || "Analysis returned an unsuccessful result.");
      }

      setAnalysisStep("coaching");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setResults(data as GaitAnalysisResponse);
      setPageState("results");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setPageState("error");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setPageState("upload");
    setResults(null);
    setErrorMessage("");
    setAnalysisStep("uploading");
    setGridPreview(null);
    setDebugInfo(null);
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
                Analyze your <span className="text-gradient">gait</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                Upload a video of yourself walking or record one with your webcam.
                Our AI will analyze your gait patterns and suggest exercises.
              </p>
            </div>
          )}

          {pageState === "upload" && (
            <VideoUpload
              onVideoReady={handleVideoReady}
              isAnalyzing={false}
            />
          )}

          {pageState === "analyzing" && (
            <>
              <AnalysisLoading currentStep={analysisStep} />
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
              <AnalysisResults data={results} onNewAnalysis={handleRetry} />
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
