"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalysisResults from "@/components/analyze/analysis-results";
import { useAuth } from "@/components/auth-context";
import { getAnalysisById, type StoredAnalysis } from "@/lib/analyses-store";
import type { GaitAnalysisResponse } from "@/types/gait-analysis";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/signin");
      return;
    }
    if (!id || !user) return;

    getAnalysisById(id)
      .then((data) => {
        if (!data) {
          setError("Analysis not found.");
        } else if (data.user_id !== user.uid) {
          setError("You don't have access to this analysis.");
        } else {
          setAnalysis(data);
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load analysis.");
      })
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1DB3FB] border-t-transparent" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header solid />
        <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-lg font-semibold text-[#202020]">
              {error || "Analysis not found"}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1DB3FB] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Convert StoredAnalysis to GaitAnalysisResponse shape for the existing component
  const responseData: GaitAnalysisResponse = {
    success: true,
    session_id: analysis.session_id,
    timestamp: analysis.timestamp,
    visual_analysis: analysis.visual_analysis,
    coaching: analysis.coaching,
    ...(analysis.key_frames ? { key_frames: analysis.key_frames } : {}),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header solid />
      <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1300px]">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[rgba(32,32,32,0.6)] hover:text-[#202020] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          <AnalysisResults
            data={responseData}
            onNewAnalysis={() => router.push("/analyze")}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
