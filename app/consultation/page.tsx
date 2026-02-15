"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#1DB3FB]" />
        </div>
      }
    >
      <ConsultationContent />
    </Suspense>
  );
}

function ConsultationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const sessionToken = searchParams.get("session_token");
  const livekitUrl = searchParams.get("livekit_url");
  const livekitToken = searchParams.get("livekit_token");
  const wsUrl = searchParams.get("ws_url");
  const avatarId = searchParams.get("avatar_id");
  const avatarName = searchParams.get("avatar_name");
  const gaitContext = searchParams.get("gait_context");
  
  const videoRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Connect to LiveKit room
  const connectToRoom = async () => {
    try {
      // @ts-ignore - LiveKit SDK loaded via CDN
      const { Room } = window.LivekitClient;
      const room = new Room();

      // Handle track subscriptions (avatar video)
      room.on("trackSubscribed", (track: any) => {
        console.log("[Consultation] Track subscribed:", track.kind);
        
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
        console.log("[Consultation] Connected to LiveKit");
        setIsConnecting(false);
        setStatus("Connected");
        
        // Start speech recognition immediately so user can interrupt
        startSpeechRecognition();
        
        // Trigger initial greeting
        if (!hasGreeted) {
          generateInitialGreeting();
        }
      });

      room.on("disconnected", () => {
        console.log("[Consultation] Disconnected");
        if (recognitionRef.current) recognitionRef.current.stop();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      });

      await room.connect(livekitUrl, livekitToken);
    } catch (err) {
      console.error("[Consultation] Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  };

  // Generate and play initial greeting
  const generateInitialGreeting = async () => {
    if (hasGreeted || !gaitContext) return;
    
    setStatus("Therapist is greeting you...");
    setHasGreeted(true);

    try {
      const response = await fetch("/api/avatar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: "[START_CONSULTATION]",
          conversation_history: [],
          gait_context: gaitContext,
          avatar_id: avatarId,
          avatar_name: avatarName,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate greeting");

      const data = await response.json();
      setConversationHistory(data.conversation_history);
      await playAudioToAvatar(data.audio, data.text);
      
      // Speech recognition already started, just update status
      setStatus("Listening...");
    } catch (err) {
      console.error("[Consultation] Greeting failed:", err);
      setError("Failed to start consultation");
    }
  };

  // Initialize continuous speech recognition
  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    
    // Don't start if already running
    if (recognitionRef.current && isListening) {
      console.log("[Consultation] Speech recognition already running");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("[Consultation] Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[Consultation] Speech recognition started");
      setIsListening(true);
      // Don't pause audio anymore - allow interruption
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log("[Consultation] User said:", transcript);
      
      // If therapist is speaking, pause the audio (user is interrupting)
      if (audioRef.current && !audioRef.current.paused) {
        console.log("[Consultation] User interrupted - pausing therapist");
        audioRef.current.pause();
        setIsSpeaking(false);
      }
      
      await handleUserMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("[Consultation] Recognition error:", event.error);
      if (event.error === "no-speech") {
        recognition.start(); // Restart
      }
    };

    recognition.onend = () => {
      // Auto-restart if user still wants to listen
      if (isListening && recognitionRef.current === recognition) {
        console.log("[Consultation] Restarting speech recognition");
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("[Consultation] Failed to start recognition:", err);
    }
  };

  // Handle user message
  const handleUserMessage = async (userMessage: string) => {
    try {
      setStatus("Processing...");

      const response = await fetch("/api/avatar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: userMessage,
          conversation_history: conversationHistory,
          gait_context: gaitContext || "",
          avatar_id: avatarId,
          avatar_name: avatarName,
        }),
      });

      if (!response.ok) throw new Error("Failed to process message");

      const data = await response.json();
      setConversationHistory(data.conversation_history);
      await playAudioToAvatar(data.audio, data.text);
      
      setStatus("Listening...");
    } catch (err) {
      console.error("[Consultation] Message processing failed:", err);
      setStatus("Error - retrying...");
    }
  };

  // Play audio directly in browser (bypass HeyGen audio)
  const playAudioToAvatar = async (base64Audio: string, text: string) => {
    try {
      console.log("[Consultation] Playing audio:", text);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create audio element from base64 MP3
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audioRef.current = audio;

      // Don't pause speech recognition - allow user to interrupt
      setIsSpeaking(true);
      setStatus("Therapist speaking... (you can interrupt)");

      // Play the audio
      await audio.play();

      // Wait for audio to finish
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          console.log("[Consultation] Audio finished");
          setIsSpeaking(false);
          setStatus("Listening...");
          resolve();
        };
        
        audio.onerror = (err) => {
          console.error("[Consultation] Audio playback error:", err);
          setIsSpeaking(false);
          setStatus("Listening...");
          resolve();
        };
      });

      console.log("[Consultation] ✅ Audio playback complete");
    } catch (err) {
      console.error("[Consultation] Audio playback failed:", err);
      setIsSpeaking(false);
      setStatus("Listening...");
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus("Paused");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setStatus("Listening...");
    }
  };

  // Add keyboard shortcut (Spacebar to toggle mic)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only toggle if spacebar and not typing in an input
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isListening]);

  // Initialize LiveKit
  useEffect(() => {
    if (!livekitUrl || !livekitToken) {
      setError("Missing LiveKit credentials");
      setIsConnecting(false);
      return;
    }

    console.log("[Consultation] Loading LiveKit SDK...");

    // Check if LiveKit is already loaded
    if ((window as any).LivekitClient) {
      console.log("[Consultation] LiveKit SDK already loaded");
      connectToRoom();
      return;
    }

    // Load LiveKit client SDK from CDN
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@livekit/components-core@0.10.0/dist/livekit-client.umd.min.js";
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log("[Consultation] LiveKit SDK loaded successfully");
      // Small delay to ensure SDK is fully initialized
      setTimeout(() => {
        if ((window as any).LivekitClient) {
          connectToRoom();
        } else {
          console.error("[Consultation] LiveKit SDK loaded but not initialized");
          setError("Failed to initialize LiveKit");
          setIsConnecting(false);
        }
      }, 100);
    };
    
    script.onerror = (err) => {
      console.error("[Consultation] Failed to load LiveKit SDK:", err);
      // Try alternative CDN
      console.log("[Consultation] Trying alternative CDN...");
      const altScript = document.createElement("script");
      altScript.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.5.7/dist/livekit-client.umd.min.js";
      altScript.crossOrigin = "anonymous";
      
      altScript.onload = () => {
        console.log("[Consultation] LiveKit SDK loaded from alternative CDN");
        setTimeout(() => {
          if ((window as any).LivekitClient) {
            connectToRoom();
          } else {
            setError("Failed to initialize LiveKit");
            setIsConnecting(false);
          }
        }, 100);
      };
      
      altScript.onerror = () => {
        console.error("[Consultation] Both CDNs failed");
        setError("Failed to load LiveKit SDK from CDN");
        setIsConnecting(false);
      };
      
      document.body.appendChild(altScript);
    };
    
    document.body.appendChild(script);

    return () => {
      try {
        const scripts = document.querySelectorAll('script[src*="livekit"]');
        scripts.forEach(s => {
          if (document.body.contains(s)) {
            document.body.removeChild(s);
          }
        });
      } catch (e) {
        console.error("[Consultation] Error removing script:", e);
      }
    };
  }, [livekitUrl, livekitToken]);

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
              <h1 className="text-lg font-bold text-gray-900">Physical Therapy Consultation</h1>
              <p className="text-sm text-gray-500">
                Status: <span className={error ? 'text-red-500' : 'text-green-500'}>{error || status}</span>
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-gray-600">Therapist speaking (you can interrupt)</span>
                </>
              ) : (
                <>
                  <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-600">{isListening ? "Listening - speak anytime!" : "Paused"}</span>
                </>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={toggleListening}
                variant={isListening ? "modern-outline" : "modern-primary"}
                size="modern-lg"
                className={`gap-3 px-8 transition-all ${isListening ? 'bg-red-50 border-red-500 text-red-600 hover:bg-red-100' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isListening ? "Pause Mic" : "Start Mic"}
              </Button>
              <span className="text-xs text-gray-500">Press SPACE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1">
        {/* Video */}
        <div className="flex-1 p-6">
          <div className="aspect-video overflow-hidden rounded-2xl border-2 border-gray-300 bg-gray-900 shadow-2xl">
            {isConnecting && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                  <p className="mt-4">Connecting...</p>
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
                  Your therapist will introduce themselves and discuss your analysis results
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

        {/* Conversation Transcript */}
        <div className="w-96 border-l border-gray-200 bg-white p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>

          <div className="space-y-4">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === "user" ? "bg-blue-50 ml-4" : "bg-gray-100 mr-4"
                }`}
              >
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {msg.role === "user" ? "You" : "Therapist"}
                </p>
                <p className="text-sm text-gray-800">{msg.content}</p>
              </div>
            ))}
          </div>

          {conversationHistory.length === 0 && (
            <p className="text-sm text-gray-400 text-center mt-8">
              Waiting for conversation...
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
