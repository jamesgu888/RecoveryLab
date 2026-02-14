"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Download } from "lucide-react";
import { getEventsForPatient } from "@/lib/recoverai/store";

interface Avatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
}

export default function AvatarSandboxPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [latestMessage, setLatestMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  // Load avatars on mount
  useEffect(() => {
    fetch("/api/avatar/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.avatars) {
          setAvatars(data.avatars);
          if (data.avatars.length > 0) {
            setSelectedAvatarId(data.avatars[0].avatar_id);
          }
        }
      })
      .catch((err) => console.error("Failed to load avatars:", err));
  }, []);

  // Load latest coaching message from events
  useEffect(() => {
    // For demo, fetch events for a test patient
    const testPatientId = "patient-demo";
    fetch(`/api/recoverai/log_checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: testPatientId, pain: 2, did_exercise: true, notes: "Demo" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.coachMessage) {
          setLatestMessage(data.coachMessage);
        }
      })
      .catch((err) => console.error("Failed to fetch message:", err));
  }, []);

  const handleSpeak = async () => {
    if (!latestMessage.trim()) {
      alert("No message to speak. Please log a check-in first.");
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setVideoId(null);
    setStatus("Generating video...");

    try {
      const res = await fetch("/api/avatar/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: latestMessage,
          avatar_id: selectedAvatarId || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setStatus(`Error: ${data.error}`);
        setIsGenerating(false);
        return;
      }

      // HeyGen returns video_id; poll for status
      const vId = data.data?.video_id || data.data?.data?.video_id;
      if (vId) {
        setVideoId(vId);
        pollVideoStatus(vId);
      } else {
        setStatus("Video generation started, but no video_id returned.");
        setIsGenerating(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${msg}`);
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (vId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setStatus("Polling timeout. Video may still be generating.");
        setIsGenerating(false);
        return;
      }

      try {
        const res = await fetch(`/api/avatar/status?video_id=${vId}`);
        const data = await res.json();

        if (data.success && data.data) {
          const statusCode = data.data.status;
          setStatus(`Status: ${statusCode}`);

          if (statusCode === "completed") {
            clearInterval(interval);
            const url = data.data.video_url || data.data.data?.video_url;
            if (url) {
              setVideoUrl(url);
              setStatus("Video ready!");
            } else {
              setStatus("Video completed but no URL returned.");
            }
            setIsGenerating(false);
          } else if (statusCode === "failed" || statusCode === "error") {
            clearInterval(interval);
            setStatus(`Video generation failed: ${statusCode}`);
            setIsGenerating(false);
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 3000);
  };

  return (
    <>
      <Header />

      <main className="px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="fade-in mb-10 text-center">
            <h2 className="h2-style text-[#202020]">
              Avatar <span className="text-gradient">Sandbox</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
              Select an avatar and hear your latest coaching message spoken aloud.
            </p>
          </div>

          {/* Avatar selection */}
          <div className="platform-feature-card mb-6 rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
            <label className="mb-2 block text-sm font-semibold text-[#202020]">Choose Avatar</label>
            <select
              value={selectedAvatarId}
              onChange={(e) => setSelectedAvatarId(e.target.value)}
              className="w-full rounded-lg border border-[rgba(32,32,32,0.15)] px-4 py-2 text-sm text-[#202020]"
            >
              {avatars.map((av) => (
                <option key={av.avatar_id} value={av.avatar_id}>
                  {av.avatar_name}
                </option>
              ))}
            </select>
          </div>

          {/* Latest message */}
          <div className="platform-feature-card mb-6 rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
            <label className="mb-2 block text-sm font-semibold text-[#202020]">Latest Coach Message</label>
            <textarea
              value={latestMessage}
              onChange={(e) => setLatestMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[rgba(32,32,32,0.15)] px-4 py-2 text-sm text-[#202020]"
              placeholder="No recent coaching message. Log a check-in to generate one."
            />
          </div>

          {/* Speak button */}
          <div className="mb-6 text-center">
            <Button
              variant="modern-primary"
              size="modern-xl"
              onClick={handleSpeak}
              disabled={isGenerating || !latestMessage.trim()}
              className="gap-2 px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Speak Message
                </>
              )}
            </Button>
          </div>

          {/* Status */}
          {status && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              {status}
            </div>
          )}

          {/* Video player */}
          {videoUrl && (
            <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
              <h3 className="mb-4 text-lg font-bold text-[#202020]">Generated Video</h3>
              <video src={videoUrl} controls className="w-full rounded-lg" />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="modern-outline"
                  size="modern-lg"
                  onClick={() => window.open(videoUrl, "_blank")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
