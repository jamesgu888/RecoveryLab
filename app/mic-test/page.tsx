"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface LogEntry {
  time: string;
  type: "info" | "error" | "result" | "interim" | "warn" | "debug";
  message: string;
}

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 2 });
}

export default function MicTestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [finalTexts, setFinalTexts] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [sttReady, setSttReady] = useState<boolean | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingVoiceRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isListeningRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { time: ts(), type, message }]);
  };

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Check environment on mount
  useEffect(() => {
    const ua = navigator.userAgent;
    addLog("debug", `User-Agent: ${ua}`);
    addLog("debug", `Page protocol: ${window.location.protocol}`);
    addLog("debug", `Secure context: ${window.isSecureContext}`);
    addLog("debug", `Online: ${navigator.onLine}`);
    addLog("info", "Using ElevenLabs Scribe for speech-to-text (server-side, works on any browser)");

    // Test STT endpoint
    checkSTTEndpoint();

    return () => {
      isListeningRef.current = false;
      stopRecording();
      if (analyserRef.current) analyserRef.current = null;
      if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch {}
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const checkSTTEndpoint = async () => {
    addLog("debug", "Testing /api/speech-to-text endpoint...");
    try {
      // Send an empty FormData to check if endpoint exists (returns 400 = no audio)
      const res = await fetch("/api/speech-to-text", { method: "POST", body: new FormData() });
      // 400 = endpoint exists but no audio (expected)
      if (res.status === 400) {
        addLog("info", "ElevenLabs STT endpoint is available");
        setSttReady(true);
      } else if (res.status === 500) {
        const data = await res.json().catch(() => ({}));
        addLog("warn", `STT endpoint returned 500: ${data.error || "unknown"}`);
        setSttReady(false);
      } else {
        addLog("info", `STT endpoint responded with status ${res.status}`);
        setSttReady(true);
      }
    } catch (err) {
      addLog("error", `STT endpoint not reachable: ${err}`);
      setSttReady(false);
    }
  };

  // Send recorded audio to ElevenLabs STT
  const transcribeAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 1000 || isTranscribingRef.current) {
      addLog("debug", `Skipping transcription: size=${audioBlob.size} transcribing=${isTranscribingRef.current}`);
      return;
    }
    isTranscribingRef.current = true;
    setInterimText("Transcribing...");
    addLog("info", `Sending ${(audioBlob.size / 1024).toFixed(1)}KB audio to ElevenLabs Scribe...`);

    const start = Date.now();
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      const elapsed = Date.now() - start;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addLog("error", `STT failed (${res.status}, ${elapsed}ms): ${errData.error || "unknown"}`);
        setInterimText("");
        return;
      }

      const data = await res.json();
      setInterimText("");

      if (data.text && data.text.trim()) {
        addLog("result", `[FINAL] "${data.text}" (${elapsed}ms)`);
        setFinalTexts((prev) => [...prev, data.text]);
      } else {
        addLog("debug", `No speech detected in audio (${elapsed}ms)`);
      }
    } catch (err) {
      addLog("error", `STT request error: ${err}`);
      setInterimText("");
    } finally {
      isTranscribingRef.current = false;
    }
  };

  // Start a new MediaRecorder session
  const startNewRecording = () => {
    if (!micStreamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(micStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        transcribeAudio(audioBlob);
      }

      // Restart recording if still listening
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) startNewRecording();
        }, 100);
      }
    };

    recorder.start();
    recorderRef.current = recorder;
    addLog("debug", "MediaRecorder started");
  };

  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch {}
    }
    recorderRef.current = null;
    chunksRef.current = [];
    isSpeakingVoiceRef.current = false;
  };

  const startMic = async () => {
    addLog("info", "Requesting microphone permission...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setHasPermission(true);

      const tracks = stream.getAudioTracks();
      addLog("info", `Mic permission granted. Audio tracks: ${tracks.length}`);

      for (const track of tracks) {
        const settings = track.getSettings();
        addLog("debug", `Track: "${track.label}" | sampleRate=${settings.sampleRate} channelCount=${settings.channelCount}`);
        track.onended = () => addLog("warn", `Mic track ended unexpectedly!`);
        track.onmute = () => addLog("warn", `Mic track MUTED by system`);
        track.onunmute = () => addLog("info", `Mic track UNMUTED`);
      }

      // Set up audio analyser
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      addLog("debug", `AudioContext state: ${ctx.state} | sampleRate: ${ctx.sampleRate}`);

      // Poll volume + voice activity detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      // Two-threshold hysteresis: high threshold to START detecting speech,
      // low threshold to STOP — prevents background noise from resetting silence timer
      const SPEECH_START_THRESHOLD = 0.10; // 10% RMS to start voice detection
      const SPEECH_STOP_THRESHOLD = 0.03;  // 3% RMS to consider silence
      const SILENCE_DURATION = 1500; // ms of silence before transcribing
      let frameCount = 0;

      const poll = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length) / 255;
        setMicLevel(rms);
        frameCount++;

        // Periodic audio level log
        if (frameCount % 120 === 0) {
          const maxVal = Math.max(...Array.from(dataArray));
          addLog("debug", `Audio sample: rms=${(rms * 100).toFixed(1)}% max_bin=${maxVal}/255 speaking=${isSpeakingVoiceRef.current}`);
        }

        // Voice activity detection with hysteresis
        if (isListeningRef.current && recorderRef.current?.state === "recording") {
          if (!isSpeakingVoiceRef.current && rms > SPEECH_START_THRESHOLD) {
            // Voice started — need high threshold to trigger
            isSpeakingVoiceRef.current = true;
            setInterimText("Listening...");
            addLog("info", `Voice detected (rms=${(rms * 100).toFixed(1)}%) — recording...`);
          } else if (isSpeakingVoiceRef.current && rms > SPEECH_START_THRESHOLD) {
            // Still clearly speaking — reset silence timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (isSpeakingVoiceRef.current && rms < SPEECH_STOP_THRESHOLD && !silenceTimerRef.current) {
            // Dropped below low threshold — start silence timer
            silenceTimerRef.current = setTimeout(() => {
              if (!isListeningRef.current || isTranscribingRef.current) return;
              isSpeakingVoiceRef.current = false;
              silenceTimerRef.current = null;
              addLog("info", "Silence detected — sending audio for transcription...");
              if (recorderRef.current && recorderRef.current.state === "recording") {
                recorderRef.current.stop();
              }
            }, SILENCE_DURATION);
          }
        }

        requestAnimationFrame(poll);
      };
      poll();
    } catch (err: any) {
      setHasPermission(false);
      addLog("error", `Mic permission denied: ${err?.name}: ${err?.message}`);
      return;
    }

    // Start recording
    addLog("info", "--- Starting MediaRecorder + ElevenLabs STT ---");
    addLog("info", "Speak for a few seconds, then pause. After 1.5s of silence, audio is sent for transcription.");
    startNewRecording();
    isListeningRef.current = true;
    setIsListening(true);
  };

  const stopMic = () => {
    addLog("info", "Stopping...");
    isListeningRef.current = false;
    stopRecording();
    analyserRef.current = null;
    if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch {}
    audioCtxRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsListening(false);
    setMicLevel(0);
    addLog("info", "Stopped and cleaned up");
  };

  const barLevel = Math.min(1, micLevel / 0.35);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Microphone & Speech-to-Text Debug</h1>
        <p className="mb-6 text-sm text-gray-500">
          Tests your mic and ElevenLabs Scribe speech-to-text. Works on any browser (Arc, Safari, Chrome, Firefox).
          <br />
          Speak for a few seconds, then pause — after 1.5s of silence, audio is sent to ElevenLabs for transcription.
        </p>

        {/* Controls */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={isListeningRef.current ? stopMic : startMic}
            className={`flex h-12 items-center gap-3 rounded-full px-6 text-sm font-semibold transition-all ${
              isListeningRef.current || isListening
                ? "border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50"
                : "bg-[#202020] text-white hover:opacity-90"
            }`}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isListening ? "Stop" : "Start Mic Test"}
          </button>

          {/* Level meter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Level:</span>
            <div className="flex h-8 items-end gap-[3px]">
              {Array.from({ length: 16 }).map((_, i) => {
                const threshold = (i + 1) / 16;
                const active = barLevel >= threshold;
                return (
                  <div
                    key={i}
                    className="w-[4px] rounded-full transition-all duration-75"
                    style={{
                      height: active ? `${8 + barLevel * 24}px` : "4px",
                      backgroundColor: active
                        ? barLevel > 0.6 ? "#22c55e" : barLevel > 0.2 ? "#1DB3FB" : "#d1d5db"
                        : "#e5e7eb",
                    }}
                  />
                );
              })}
            </div>
            <span className="min-w-[3rem] text-xs font-mono text-gray-500">
              {(micLevel * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge label="Mic Permission" ok={hasPermission} />
          <Badge label="STT Endpoint" ok={sttReady} />
          <Badge label="Listening" ok={isListening} />
          <Badge label="Audio Level" ok={micLevel > 0.02} />
        </div>

        {/* Live transcription */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Live Transcription
          </h3>
          {interimText && (
            <p className="mb-2 text-sm italic text-blue-500">
              {interimText}
            </p>
          )}
          {finalTexts.length > 0 ? (
            <div className="space-y-1">
              {finalTexts.map((t, i) => (
                <p key={i} className="text-sm text-gray-800">
                  <span className="mr-2 text-xs font-semibold text-green-500">#{i + 1}</span>
                  {t}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300">
              {isListening ? "Speak now, then pause — text will appear after silence..." : "Start the test to begin"}
            </p>
          )}
        </div>

        {/* Debug log */}
        <div className="rounded-xl border border-gray-200 bg-gray-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Event Log
            </h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              Clear
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-gray-600">{log.time}</span>
                <span
                  className={
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "warn"
                        ? "text-yellow-400"
                        : log.type === "result"
                          ? "text-green-400"
                          : log.type === "interim"
                            ? "text-blue-400"
                            : log.type === "debug"
                              ? "text-gray-500"
                              : "text-gray-400"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok === null
          ? "bg-gray-100 text-gray-400"
          : ok
            ? "bg-green-50 text-green-600"
            : "bg-red-50 text-red-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok === null ? "bg-gray-300" : ok ? "bg-green-500" : "bg-red-400"
        }`}
      />
      {label}
    </span>
  );
}
