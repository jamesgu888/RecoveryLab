"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Mic, MicOff, Loader2, Send } from "lucide-react";
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
  const patientId = searchParams.get("patient_id");

  const router = useRouter();
  const videoRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const conversationRef = useRef<Message[]>([]);
  const transcriptSavedRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const isListeningRef = useRef(false);

  // MediaRecorder refs for ElevenLabs STT
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingVoiceRef = useRef(false); // tracks if user voice is detected
  const isTranscribingRef = useRef(false);

  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    conversationRef.current = conversationHistory;
  }, [conversationHistory]);

  // Save transcript to server
  const saveTranscript = useCallback(async () => {
    if (transcriptSavedRef.current) return;
    const messages = conversationRef.current;
    if (!sessionId || !patientId || messages.length === 0) return;

    transcriptSavedRef.current = true;
    try {
      await fetch("/api/avatar/save-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_session_id: sessionId,
          patient_id: patientId,
          conversation_history: messages,
        }),
      });
      console.log("[Consultation] Transcript saved");
    } catch (err) {
      console.error("[Consultation] Failed to save transcript:", err);
      transcriptSavedRef.current = false;
    }
  }, [sessionId, patientId]);

  // Save transcript on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationRef.current.length > 0 && !transcriptSavedRef.current && sessionId && patientId) {
        navigator.sendBeacon(
          "/api/avatar/save-transcript",
          new Blob(
            [JSON.stringify({
              avatar_session_id: sessionId,
              patient_id: patientId,
              conversation_history: conversationRef.current,
            })],
            { type: "application/json" }
          )
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      isListeningRef.current = false;
      stopRecording();
      analyserRef.current = null;
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      saveTranscript();
    };
  }, [saveTranscript, sessionId, patientId]);

  // Release mic stream helper
  const releaseMic = () => {
    isListeningRef.current = false;
    stopRecording();
    analyserRef.current = null;
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMicLevel(0);
  };

  // Handle "End Session" button
  const handleEndSession = async () => {
    sessionEndedRef.current = true;
    // Stop audio immediately so user doesn't hear speech after clicking end
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    releaseMic();
    // Save transcript in background — don't block navigation
    saveTranscript();
    router.push("/dashboard");
  };

  // Stop the MediaRecorder
  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* */ }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    isSpeakingVoiceRef.current = false;
  };

  // Send recorded audio to ElevenLabs STT
  const transcribeAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 1000 || isTranscribingRef.current) return; // Skip tiny clips
    isTranscribingRef.current = true;
    setInterimText("Transcribing...");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("[Consultation] STT request failed:", res.status);
        setInterimText("");
        return;
      }

      const data = await res.json();
      setInterimText("");

      if (data.text && data.text.trim()) {
        console.log("[Consultation] User said:", data.text);

        // If therapist is speaking, pause (user is interrupting)
        if (audioRef.current && !audioRef.current.paused) {
          console.log("[Consultation] User interrupted - pausing therapist");
          audioRef.current.pause();
          setIsSpeaking(false);
        }

        await handleUserMessage(data.text);
      }
    } catch (err) {
      console.error("[Consultation] STT error:", err);
      setInterimText("");
    } finally {
      isTranscribingRef.current = false;
    }
  };

  // Start mic + MediaRecorder with silence detection
  const startMicAndRecording = async () => {
    if (typeof window === "undefined") return;

    // Get mic permission
    if (!micStreamRef.current) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[Consultation] Microphone stream acquired");

        // Set up Web Audio analyser for volume metering
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(micStreamRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        // Poll volume level
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        // Two-threshold hysteresis: high threshold to START detecting speech,
        // low threshold to detect silence. Prevents background noise (~5-9% RMS)
        // from keeping the silence timer reset indefinitely.
        const SPEECH_START_THRESHOLD = 0.10; // Must exceed this to begin speech detection
        const SPEECH_STOP_THRESHOLD = 0.03;  // Must drop below this to trigger silence timer
        const SILENCE_DURATION = 1500; // ms of silence before sending for transcription

        const poll = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
          const rms = Math.sqrt(sum / dataArray.length) / 255;
          setMicLevel(rms);

          // Voice activity detection with two-threshold hysteresis
          if (isListeningRef.current && recorderRef.current?.state === "recording") {
            if (!isSpeakingVoiceRef.current) {
              // Not currently speaking — need high threshold to start
              if (rms > SPEECH_START_THRESHOLD) {
                isSpeakingVoiceRef.current = true;
                setInterimText("Listening...");
              }
            } else {
              // Currently speaking — use hysteresis thresholds
              if (rms > SPEECH_START_THRESHOLD) {
                // Clearly speaking — clear any silence timer
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = null;
                }
              } else if (rms < SPEECH_STOP_THRESHOLD && !silenceTimerRef.current) {
                // Dropped below stop threshold — start silence timer
                silenceTimerRef.current = setTimeout(() => {
                  if (!isListeningRef.current || isTranscribingRef.current) return;
                  isSpeakingVoiceRef.current = false;
                  silenceTimerRef.current = null;

                  // Stop recorder to trigger ondataavailable with the full clip
                  if (recorderRef.current && recorderRef.current.state === "recording") {
                    recorderRef.current.stop();
                  }
                }, SILENCE_DURATION);
              }
              // If between thresholds (0.03–0.10), do nothing — let existing timer continue
              // or keep speaking state without resetting timer
            }
          }

          requestAnimationFrame(poll);
        };
        poll();
      } catch (err) {
        console.error("[Consultation] Microphone permission denied:", err);
        setStatus("Microphone access denied — please allow mic permission");
        return;
      }
    }

    // Start MediaRecorder
    startNewRecording();

    isListeningRef.current = true;
    setIsListening(true);
    setStatus("Listening...");
  };

  // Start a new recording session (called initially and after each transcription)
  const startNewRecording = () => {
    if (!micStreamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(micStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      // Combine chunks into a single blob and transcribe
      if (chunksRef.current.length > 0) {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        transcribeAudio(audioBlob);
      }

      // Start a new recording session if still listening
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            startNewRecording();
          }
        }, 100);
      }
    };

    recorder.start();
    recorderRef.current = recorder;
    console.log("[Consultation] MediaRecorder started");
  };

  // Connect to LiveKit room
  const connectToRoom = async () => {
    try {
      // @ts-ignore - LiveKit SDK loaded via CDN
      const { Room } = window.LivekitClient;
      const room = new Room();

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

      room.on("connected", async () => {
        console.log("[Consultation] Connected to LiveKit");
        setIsConnecting(false);
        setStatus("Connected");

        // Start mic and recording
        await startMicAndRecording();

        // Trigger initial greeting
        if (!hasGreeted) {
          generateInitialGreeting();
        }
      });

      room.on("disconnected", () => {
        console.log("[Consultation] Disconnected");
        releaseMic();
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

      setStatus("Listening...");
    } catch (err) {
      console.error("[Consultation] Greeting failed:", err);
      setError("Failed to start consultation");
    }
  };

  // Handle user message
  const handleUserMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) return;
    try {
      setIsProcessing(true);
      setStatus("Processing...");

      const response = await fetch("/api/avatar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: userMessage,
          conversation_history: conversationRef.current,
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
      setStatus("Error - try again");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text input submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const msg = textInput.trim();
    setTextInput("");
    handleUserMessage(msg);
  };

  // Play audio directly in browser
  const playAudioToAvatar = async (base64Audio: string, text: string) => {
    // Don't play if session has ended
    if (sessionEndedRef.current) return;

    try {
      console.log("[Consultation] Playing audio:", text);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audioRef.current = audio;

      setIsSpeaking(true);
      setStatus("Therapist speaking... (you can interrupt)");

      await audio.play();

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

      console.log("[Consultation] Audio playback complete");
    } catch (err) {
      console.error("[Consultation] Audio playback failed:", err);
      setIsSpeaking(false);
      setStatus("Listening...");
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      stopRecording();
      setIsListening(false);
      setStatus("Paused");
    } else {
      startMicAndRecording();
    }
  };

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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

    if ((window as any).LivekitClient) {
      console.log("[Consultation] LiveKit SDK already loaded");
      connectToRoom();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@livekit/components-core@0.10.0/dist/livekit-client.umd.min.js";
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log("[Consultation] LiveKit SDK loaded successfully");
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

    script.onerror = () => {
      console.log("[Consultation] Trying alternative CDN...");
      const altScript = document.createElement("script");
      altScript.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.5.7/dist/livekit-client.umd.min.js";
      altScript.crossOrigin = "anonymous";

      altScript.onload = () => {
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
            <button
              onClick={handleEndSession}
              className="flex h-10 items-center gap-2 rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50"
            >
              <ArrowLeft className="h-4 w-4" />
              End Session
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Physical Therapy Consultation</h1>
              <p className="text-sm text-gray-500">
                Status: <span className={error ? 'text-red-500' : 'text-green-500'}>{error || status}</span>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Audio level meter */}
            {isListening && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[rgba(32,32,32,0.45)]">Mic</span>
                <div className="flex h-6 items-end gap-[3px]">
                  {[0.08, 0.15, 0.1, 0.2, 0.12, 0.18, 0.08].map((threshold, i) => {
                    const barLevel = Math.min(1, micLevel / 0.35);
                    const barHeight = Math.max(3, barLevel > threshold ? barLevel * 24 : 3);
                    return (
                      <div
                        key={i}
                        className="w-[3px] rounded-full transition-all duration-75"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor:
                            barLevel > 0.6
                              ? "#22c55e"
                              : barLevel > 0.2
                                ? "#1DB3FB"
                                : "rgba(32,32,32,0.15)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status text */}
            <span className="text-sm text-[rgba(32,32,32,0.5)]">
              {isSpeaking
                ? "Therapist speaking..."
                : isListening
                  ? "Listening"
                  : "Paused"}
            </span>

            {/* Mic toggle button */}
            <button
              onClick={toggleListening}
              className={`relative flex h-10 items-center gap-2.5 rounded-full px-5 text-sm font-semibold transition-all ${
                isListening
                  ? "border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50"
                  : "border border-[rgba(32,32,32,0.06)] bg-[#202020] text-white shadow-[0_0_1px_3px_#494949_inset,0_6px_5px_0_rgba(0,0,0,0.55)_inset] hover:opacity-90"
              }`}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <MicOff className="h-4 w-4" />
                  Mute
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Unmute
                </>
              )}
            </button>
            <kbd className="hidden rounded-md border border-[rgba(32,32,32,0.1)] bg-[rgba(32,32,32,0.03)] px-1.5 py-0.5 text-[10px] font-medium text-[rgba(32,32,32,0.4)] sm:inline-block">
              SPACE
            </kbd>
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
                  Speak naturally — your voice is transcribed automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DB3FB]" />
                  You can also type messages using the text input below
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Conversation Transcript */}
        <div className="flex w-96 flex-col border-l border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-bold text-[#202020]">Conversation</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {conversationHistory
              .filter((msg) => msg.content !== "[START_CONSULTATION]")
              .map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-3 ${
                  msg.role === "user"
                    ? "ml-6 bg-[#E0F5FF]"
                    : "mr-6 bg-[rgba(32,32,32,0.04)]"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(32,32,32,0.4)]">
                  {msg.role === "user" ? "You" : "Therapist"}
                </p>
                <p className="text-sm leading-relaxed text-[#202020]">{msg.content}</p>
              </div>
            ))}

            {/* Live transcription preview */}
            {interimText && (
              <div className="ml-6 rounded-xl border border-dashed border-[#1DB3FB]/30 bg-[#E0F5FF]/40 p-3">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1DB3FB]">
                  {interimText === "Transcribing..." ? "Processing..." : "Hearing you..."}
                </p>
                <p className="text-sm italic text-[rgba(32,32,32,0.6)]">{interimText}</p>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="mr-6 flex items-center gap-2 rounded-xl bg-[rgba(32,32,32,0.04)] p-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[rgba(32,32,32,0.4)]" />
                <span className="text-xs text-[rgba(32,32,32,0.5)]">Therapist is thinking...</span>
              </div>
            )}

            {conversationHistory.length === 0 && !isProcessing && (
              <p className="pt-8 text-center text-xs text-[rgba(32,32,32,0.3)]">
                Waiting for conversation...
              </p>
            )}
          </div>

          {/* Text input fallback */}
          <form onSubmit={handleTextSubmit} className="border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isProcessing}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-[#202020] placeholder-gray-400 focus:border-[#1DB3FB] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DB3FB] text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
