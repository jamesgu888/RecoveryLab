"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Video, Camera, X, RotateCcw, Circle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  onVideoReady: (file: File) => void;
  isAnalyzing: boolean;
  maxSizeMB?: number;
}

type Tab = "upload" | "record";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoUpload({
  onVideoReady,
  isAnalyzing,
  maxSizeMB = 100,
}: VideoUploadProps) {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Webcam state
  const [cameraPermission, setCameraPermission] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const acceptedTypes = ["video/mp4", "video/webm", "video/quicktime"];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return "Invalid file type. Please upload an MP4, WebM, or MOV video.";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File too large. Maximum size is ${maxSizeMB}MB.`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);

      // Check video duration
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(url);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Could not read video file.");
      };
    },
    [validateFile, previewUrl]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  // --- Webcam ---

  const requestCamera = useCallback(async () => {
    setCameraPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraPermission("granted");

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
      }
    } catch {
      setCameraPermission("denied");
    }
  }, []);

  // Request camera when switching to record tab
  useEffect(() => {
    if (activeTab === "record" && cameraPermission === "idle") {
      requestCamera();
    }
    if (activeTab === "upload") {
      stopCamera();
      setCameraPermission("idle");
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [activeTab, cameraPermission, requestCamera, stopCamera]);

  // Attach stream to video element when permission granted
  useEffect(() => {
    if (cameraPermission === "granted" && webcamVideoRef.current && mediaStreamRef.current) {
      webcamVideoRef.current.srcObject = mediaStreamRef.current;
      webcamVideoRef.current.play();
    }
  }, [cameraPermission]);

  const startRecording = useCallback(() => {
    if (!mediaStreamRef.current) return;

    chunksRef.current = [];
    setRecordedBlob(null);
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
    setRecordedPreviewUrl(null);
    setRecordingDuration(0);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedPreviewUrl(url);
      setIsRecording(false);
    };

    recorder.start(100);
    setIsRecording(true);

    let elapsed = 0;
    durationIntervalRef.current = setInterval(() => {
      elapsed += 1;
      setRecordingDuration(elapsed);
      if (elapsed >= 30) {
        recorder.stop();
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      }
    }, 1000);
  }, [recordedPreviewUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
    setRecordedPreviewUrl(null);
    setRecordingDuration(0);
    setError(null);
  }, [recordedPreviewUrl]);

  const handleUseRecording = useCallback(() => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `gait-recording-${Date.now()}.webm`, {
      type: "video/webm",
    });
    onVideoReady(file);
  }, [recordedBlob, onVideoReady]);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="mb-6 flex items-center justify-center">
        <div className="inline-flex rounded-full bg-white p-1 shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)]">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
              activeTab === "upload"
                ? "bg-gradient-to-b from-[#515151] to-[#202020] text-white shadow-[0_0_1.054px_3.163px_#494949_inset,0_6.325px_5.271px_0_rgba(0,0,0,0.55)_inset]"
                : "text-[rgba(32,32,32,0.75)] hover:text-[#202020]"
            )}
            disabled={isAnalyzing}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
              activeTab === "record"
                ? "bg-gradient-to-b from-[#515151] to-[#202020] text-white shadow-[0_0_1.054px_3.163px_#494949_inset,0_6.325px_5.271px_0_rgba(0,0,0,0.55)_inset]"
                : "text-[rgba(32,32,32,0.75)] hover:text-[#202020]"
            )}
            disabled={isAnalyzing}
          >
            <Camera className="h-4 w-4" />
            Record
          </button>
        </div>
      </div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="fade-in">
          {!selectedFile ? (
            /* Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "platform-feature-card relative flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed p-10 transition-all duration-200",
                isDragOver
                  ? "border-[#1DA1F2] bg-[rgba(29,161,242,0.04)]"
                  : "border-[rgba(32,32,32,0.15)] hover:border-[rgba(32,32,32,0.3)]",
                isAnalyzing && "pointer-events-none opacity-60"
              )}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                <Upload
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isDragOver ? "text-[#1DA1F2]" : "text-[rgba(32,32,32,0.5)]"
                  )}
                />
              </div>

              <p className="mb-1 text-base font-semibold text-[#202020]">
                {isDragOver ? "Drop your video here" : "Drag & drop your video"}
              </p>
              <p className="mb-4 text-sm text-[rgba(32,32,32,0.5)]">
                or click to browse files
              </p>

              <div className="flex items-center gap-3 text-xs text-[rgba(32,32,32,0.4)]">
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  MP4, WebM, MOV
                </span>
                <span className="h-3 w-px bg-[rgba(32,32,32,0.12)]" />
                <span>Max {maxSizeMB}MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            /* File Preview */
            <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
              <div className="relative mb-4 overflow-hidden rounded-lg bg-black">
                <video
                  src={previewUrl || undefined}
                  controls
                  className="mx-auto max-h-[320px] w-full object-contain"
                  preload="metadata"
                />
                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    aria-label="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                  <Video className="h-4 w-4 text-[#1DA1F2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#202020]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[rgba(32,32,32,0.5)]">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <Button
                variant="modern-primary"
                size="modern-xl"
                className="w-full gap-2"
                onClick={() => onVideoReady(selectedFile)}
                disabled={isAnalyzing}
              >
                Analyze Gait
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Record Tab */}
      {activeTab === "record" && (
        <div className="fade-in">
          <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
            {cameraPermission === "requesting" && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[rgba(32,32,32,0.1)] border-t-[#1DA1F2]" />
                <p className="text-sm text-[rgba(32,32,32,0.75)]">
                  Requesting camera access...
                </p>
              </div>
            )}

            {cameraPermission === "denied" && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <Camera className="h-6 w-6 text-red-400" />
                </div>
                <p className="mb-2 text-base font-semibold text-[#202020]">
                  Camera access denied
                </p>
                <p className="mb-4 text-center text-sm text-[rgba(32,32,32,0.5)]">
                  Please allow camera access in your browser settings and try again.
                </p>
                <Button
                  variant="modern-outline"
                  size="modern-lg"
                  onClick={() => {
                    setCameraPermission("idle");
                    requestCamera();
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {cameraPermission === "granted" && !recordedBlob && (
              <>
                {/* Live Feed */}
                <div className="relative mb-4 overflow-hidden rounded-lg bg-black">
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="mx-auto max-h-[320px] w-full object-contain"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {isRecording && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-white">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <Button
                      variant="modern-primary"
                      size="modern-xl"
                      className="gap-2"
                      onClick={startRecording}
                      disabled={isAnalyzing}
                    >
                      <Circle className="h-4 w-4 fill-red-400 text-red-400" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      variant="modern-primary"
                      size="modern-xl"
                      className="gap-2"
                      onClick={stopRecording}
                    >
                      <Square className="h-3.5 w-3.5 fill-white text-white" />
                      Stop Recording
                    </Button>
                  )}
                </div>

                <p className="mt-3 text-center text-xs text-[rgba(32,32,32,0.4)]">
                  Record yourself walking for 10-15 seconds for best results (max 30s)
                </p>
              </>
            )}

            {cameraPermission === "granted" && recordedBlob && (
              <>
                {/* Recorded Preview */}
                <div className="relative mb-4 overflow-hidden rounded-lg bg-black">
                  <video
                    src={recordedPreviewUrl || undefined}
                    controls
                    className="mx-auto max-h-[320px] w-full object-contain"
                    preload="metadata"
                  />
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E0F5FF] to-white">
                    <Video className="h-4 w-4 text-[#1DA1F2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#202020]">
                      Recorded Video
                    </p>
                    <p className="text-xs text-[rgba(32,32,32,0.5)]">
                      {formatFileSize(recordedBlob.size)} &middot;{" "}
                      {formatDuration(recordingDuration)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="modern-outline"
                    size="modern-xl"
                    className="flex-1 gap-2"
                    onClick={clearRecording}
                    disabled={isAnalyzing}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Re-record
                  </Button>
                  <Button
                    variant="modern-primary"
                    size="modern-xl"
                    className="flex-1 gap-2"
                    onClick={handleUseRecording}
                    disabled={isAnalyzing}
                  >
                    Analyze Gait
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
