"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ConsultationPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const sessionToken = searchParams.get("session_token");
  const livekitUrl = searchParams.get("livekit_url");
  const livekitToken = searchParams.get("livekit_token");
  const wsUrl = searchParams.get("ws_url");
  const initialMessage = searchParams.get("initial_message");
  
  const videoRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasSentInitialMessage, setHasSentInitialMessage] = useState(false);

  useEffect(() => {
    if (!livekitUrl || !livekitToken) {
      setError("Missing LiveKit credentials");
      setIsConnecting(false);
      return;
    }

    console.log("Loading LiveKit SDK...");
    console.log("LiveKit URL:", livekitUrl);
    console.log("WebSocket URL:", wsUrl);
    console.log("Initial message length:", initialMessage?.length);

    // Load LiveKit client SDK
    const script = document.createElement("script");
    script.src = "https://unpkg.com/livekit-client@2.5.7/dist/livekit-client.umd.min.js";
    script.async = true;
    script.onload = () => {
      console.log("LiveKit SDK loaded successfully");
      connectToRoom();
    };
    script.onerror = (err) => {
      console.error("Failed to load LiveKit SDK:", err);
      setError("Failed to load LiveKit SDK");
      setIsConnecting(false);
    };
    document.body.appendChild(script);

    return () => {
      try {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      } catch (e) {
        console.error("Error removing script:", e);
      }
    };
  }, [livekitUrl, livekitToken]);

  const connectToRoom = async () => {
    try {
      // @ts-ignore - LiveKit SDK loaded via CDN
      const { Room } = window.LivekitClient;
      
      const room = new Room();

      // Handle track subscriptions (avatar video)
      room.on("trackSubscribed", (track: any, publication: any, participant: any) => {
        console.log("Track subscribed:", track.kind, "from", participant.identity);
        
        if (track.kind === "video" && videoRef.current) {
          const element = track.attach();
          videoRef.current.innerHTML = "";
          videoRef.current.appendChild(element);
          element.style.width = "100%";
          element.style.height = "100%";
          element.style.objectFit = "cover";
        }
      });

      room.on("trackUnsubscribed", (track: any) => {
        track.detach();
      });

      room.on("connected", () => {
        console.log("Connected to LiveKit room");
        setIsConnecting(false);
        
        // Connect to WebSocket and send initial message once connected to LiveKit
        if (wsUrl && initialMessage && !hasSentInitialMessage) {
          connectWebSocket();
        }
      });

      room.on("disconnected", () => {
        console.log("Disconnected from room");
        if (wsRef.current) {
          wsRef.current.close();
        }
      });

      // Connect to the room
      await room.connect(livekitUrl, livekitToken);
      console.log("Successfully connected to room");

    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  };

  const connectWebSocket = () => {
    if (!wsUrl || !initialMessage) return;

    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Send initial message to make avatar speak
      const speakCommand = {
        type: "speak",
        text: initialMessage,
      };
      console.log("Sending speak command:", speakCommand);
      ws.send(JSON.stringify(speakCommand));
      setHasSentInitialMessage(true);
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message:", event.data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
  };

  if (!sessionId || !sessionToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid Session</h1>
          <p className="mt-2 text-gray-600">Please schedule a new consultation.</p>
          <Link href="/analyze" className="mt-4 inline-block text-[#1DB3FB] hover:underline">
            Back to Analysis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/analyze">
              <Button variant="modern-outline" size="modern-sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Virtual Consultation</h1>
              <p className="text-sm text-gray-500">Session: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isMuted ? "modern-outline" : "modern-primary"}
              size="modern-sm"
              onClick={() => setIsMuted(!isMuted)}
              className="gap-2"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              variant={isVideoEnabled ? "modern-primary" : "modern-outline"}
              size="modern-sm"
              onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              className="gap-2"
            >
              {isVideoEnabled ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              Video
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="relative w-full max-w-4xl">
          {/* Video Container */}
          <div className="aspect-video overflow-hidden rounded-2xl border-2 border-gray-300 bg-gray-900 shadow-2xl">
            {isConnecting && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-white" />
                  <p className="mt-4 text-white">Connecting to your therapist...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white">
                  <p className="text-lg font-semibold">Connection Error</p>
                  <p className="mt-2 text-sm text-gray-300">{error}</p>
                </div>
              </div>
            )}
            
            <div
              ref={videoRef}
              className="h-full w-full"
              style={{ display: isConnecting || error ? "none" : "block" }}
            />
          </div>

          {/* Info Card */}
          {!error && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900">How to Use</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DB3FB]" />
                  Your therapist will introduce themselves and discuss your gait analysis results
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DB3FB]" />
                  Use your microphone to ask questions about your analysis or exercises
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DB3FB]" />
                  The therapist will provide personalized guidance based on your needs
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
