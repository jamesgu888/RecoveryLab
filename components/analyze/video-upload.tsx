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
                  ? "border-[#1DB3FB] bg-[rgba(29,179,251,0.04)]"
                  : "border-[rgba(32,32,32,0.15)] hover:border-[rgba(32,32,32,0.3)]",
                isAnalyzing && "pointer-events-none opacity-60"
              )}
            >
              <div className="mb-4">
                <svg width="160" height="141" viewBox="0 0 204 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_upload)">
                    <path d="M100.338 56.2333C108.912 52.0257 124.134 46.5596 132.376 43.5315L132.722 44.4705C124.449 47.5097 109.292 52.9527 100.779 57.1311C75.2592 69.6555 54.1004 84.9062 40.5172 99.4208C33.7246 106.679 28.8453 113.734 26.2526 120.152C23.6597 126.571 23.3731 132.299 25.6656 136.97L24.7679 137.411C22.306 132.394 22.6698 126.35 25.3246 119.778C27.9797 113.205 32.9456 106.048 39.7868 98.7371C53.472 84.1135 74.7386 68.7971 100.338 56.2333Z" fill="#76CFFA"/>
                    <path d="M185.862 22.7255C186.837 22.9156 187.588 23.5133 188.018 24.2721C188.041 24.3134 188.066 24.3582 188.084 24.3949C188.686 25.5737 188.552 27.1555 187.387 28.208L151.98 60.1846C150.225 61.7694 147.416 60.9534 146.782 58.6761L142.899 44.7329C142.868 44.6196 142.747 44.5737 142.656 44.62C141.803 45.0557 140.952 45.4965 140.103 45.9412C136.593 47.7806 132.433 44.2743 134.115 40.4534C135.614 37.0498 137.186 33.6624 138.831 30.2948C138.851 30.2529 138.855 30.2066 138.844 30.1648L135.335 17.5612C134.701 15.2816 136.688 13.1345 139.009 13.5871L185.862 22.7255Z" fill="#1DB3FB"/>
                    <path d="M185.862 22.7255C186.837 22.9156 187.588 23.5133 188.018 24.2721C188.041 24.3134 188.066 24.3582 188.084 24.3949C188.686 25.5737 188.552 27.1555 187.387 28.208L151.98 60.1846C150.225 61.7694 147.416 60.9534 146.782 58.6761L142.899 44.7329C142.868 44.6196 142.747 44.5737 142.656 44.62C141.803 45.0557 140.952 45.4965 140.103 45.9412C136.593 47.7806 132.433 44.2743 134.115 40.4534C135.614 37.0498 137.186 33.6624 138.831 30.2948C138.851 30.2529 138.855 30.2066 138.844 30.1648L135.335 17.5612C134.701 15.2816 136.688 13.1345 139.009 13.5871L185.862 22.7255Z" fill="url(#paint0_linear_upload)"/>
                    <path d="M185.862 22.7255C186.837 22.9156 187.588 23.5133 188.018 24.2721C188.041 24.3134 188.066 24.3582 188.084 24.3949C188.686 25.5737 188.552 27.1555 187.387 28.208L151.98 60.1846C150.225 61.7694 147.416 60.9534 146.782 58.6761L142.899 44.7329C142.868 44.6196 142.747 44.5737 142.656 44.62C141.803 45.0557 140.952 45.4965 140.103 45.9412C136.593 47.7806 132.433 44.2743 134.115 40.4534C135.614 37.0498 137.186 33.6624 138.831 30.2948C138.851 30.2529 138.855 30.2066 138.844 30.1648L135.335 17.5612C134.701 15.2816 136.688 13.1345 139.009 13.5871L185.862 22.7255Z" stroke="white" strokeWidth="3"/>
                    <path d="M185.744 25.092C185.906 25.0873 185.944 25.3164 185.789 25.3649C169.751 30.3774 154.329 36.7866 139.428 44.6088C137.08 45.841 134.429 43.4767 135.488 41.047C136.985 37.6108 138.542 34.2359 140.313 30.6471C155.217 27.7849 170.488 25.5325 185.744 25.092Z" fill="url(#paint2_linear_upload)"/>
                    <path d="M185.744 25.092C185.906 25.0873 185.944 25.3164 185.789 25.3649C169.751 30.3774 154.329 36.7866 139.428 44.6088C137.08 45.841 134.429 43.4767 135.488 41.047C136.985 37.6108 138.542 34.2359 140.313 30.6471C155.217 27.7849 170.488 25.5325 185.744 25.092Z" fill="url(#paint3_linear_upload)" fillOpacity="0.55"/>
                    <circle cx="121.817" cy="18.8144" r="2.1093" transform="rotate(25.6441 121.817 18.8144)" fill="white"/>
                    <circle cx="193.815" cy="35.8139" r="2.1093" transform="rotate(25.6441 193.815 35.8139)" fill="white"/>
                    <circle cx="188.691" cy="52.9367" r="0.7031" transform="rotate(25.6441 188.691 52.9367)" fill="white"/>
                    <circle cx="118.018" cy="9.25959" r="0.35155" transform="rotate(25.6441 118.018 9.25959)" fill="#57C6FC"/>
                    <circle cx="183.939" cy="9.93813" r="0.7031" transform="rotate(25.6441 183.939 9.93813)" fill="white"/>
                    <path d="M152 95.5003C152 123.391 129.39 146 101.5 146C73.6095 146 51 123.391 51 95.5003C51 67.61 73.6095 45.0005 101.5 45.0005C129.39 45.0005 152 67.61 152 95.5003Z" fill="#CEF0FF"/>
                    <path d="M152 95.5003C152 123.391 129.39 146 101.5 146C73.6095 146 51 123.391 51 95.5003C51 67.61 73.6095 45.0005 101.5 45.0005C129.39 45.0005 152 67.61 152 95.5003Z" fill="url(#paint4_linear_upload)" fillOpacity="0.7"/>
                    <circle cx="101.5" cy="95.5005" r="30.5" fill="#1DB3FB"/>
                    <circle cx="101.5" cy="95.5005" r="30.5" fill="url(#paint5_linear_upload)" fillOpacity="0.32"/>
                    <path d="M102.252 86.8464C102.828 86.9068 103.322 87.1605 103.651 87.3591C104.074 87.6137 104.493 87.9469 104.885 88.2934C105.674 88.99 106.508 89.8872 107.25 90.7413C107.999 91.6036 108.687 92.4608 109.185 93.0997C109.435 93.4199 109.639 93.6878 109.781 93.8761C109.852 93.9702 109.909 94.0443 109.947 94.0958C109.966 94.1215 109.981 94.1421 109.991 94.156C109.996 94.1628 109.999 94.1685 110.002 94.1723C110.004 94.1741 110.006 94.1745 110.007 94.1755V94.1788C110.552 94.9199 110.395 95.9638 109.654 96.5095C108.913 97.0547 107.869 96.8956 107.323 96.1547L107.322 96.1514C107.32 96.1488 107.316 96.1453 107.312 96.1401C107.303 96.1287 107.291 96.1108 107.274 96.088C107.24 96.0418 107.188 95.9726 107.121 95.8845C106.988 95.7083 106.796 95.4547 106.558 95.1505C106.081 94.5395 105.432 93.7297 104.734 92.9255C104.378 92.5153 104.016 92.1164 103.666 91.7504V103.5C103.666 104.421 102.92 105.167 101.999 105.167C101.079 105.167 100.333 104.42 100.333 103.5V91.7504C99.9824 92.1164 99.6211 92.5153 99.265 92.9255C98.5668 93.7297 97.9173 94.5395 97.4404 95.1505C97.203 95.4547 97.0104 95.7083 96.8773 95.8845C96.8108 95.9726 96.7587 96.0418 96.7243 96.088C96.7073 96.1108 96.6952 96.1288 96.6868 96.1401C96.6829 96.1453 96.679 96.1489 96.6771 96.1514L96.6755 96.1547L96.5664 96.2865C95.9995 96.9126 95.0396 97.0208 94.3447 96.5095C93.6039 95.9638 93.4447 94.9199 93.9899 94.1788L93.9915 94.1755C93.9922 94.1746 93.9937 94.1737 93.9948 94.1723C93.9976 94.1685 94.0027 94.1628 94.0078 94.156C94.0181 94.1421 94.0326 94.1215 94.0518 94.0958C94.0901 94.0443 94.1467 93.9702 94.2178 93.8761C94.36 93.6878 94.5636 93.4199 94.8135 93.0997C95.312 92.4608 96.0001 91.6036 96.7487 90.7413C97.4903 89.8872 98.3252 88.99 99.1136 88.2934C99.5057 87.9469 99.9251 87.6137 100.347 87.3591C100.724 87.1321 101.316 86.8335 101.999 86.8334L102.252 86.8464Z" fill="#F9FCFF"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M101.999 77.6667C112.124 77.6667 120.333 85.8749 120.333 96.0001C120.333 106.125 112.124 114.333 101.999 114.333C91.8741 114.333 83.666 106.125 83.666 96.0001C83.666 85.8749 91.8741 77.6667 101.999 77.6667ZM101.999 81.0001C93.7151 81.0001 86.9993 87.7158 86.9993 96.0001C86.9993 104.284 93.7151 111 101.999 111C110.284 111 116.999 104.284 116.999 96.0001C116.999 87.7158 110.284 81.0001 101.999 81.0001Z" fill="#F9FCFF"/>
                    <path d="M25.6672 136.97C27.9598 141.641 32.6658 144.918 39.3297 146.794C45.9932 148.67 54.5586 149.127 64.4561 148.194C84.2474 146.329 109.255 138.921 134.775 126.397C150.21 118.821 164.053 110.248 175.59 101.441L175.893 101.838L176.197 102.235C164.604 111.085 150.704 119.693 135.215 127.294C109.616 139.858 84.4896 147.31 64.5496 149.189C54.5816 150.129 45.882 149.678 39.0583 147.757C32.235 145.836 27.2315 142.426 24.7695 137.41L25.6672 136.97Z" fill="#76CFFA"/>
                  </g>
                  <defs>
                    <linearGradient id="paint0_linear_upload" x1="184.988" y1="27.7804" x2="134.413" y2="43.5863" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFF4BD"/>
                      <stop offset="1" stopColor="#B6E8FF" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="paint2_linear_upload" x1="183.192" y1="25.5129" x2="142.926" y2="44.0822" gradientUnits="userSpaceOnUse">
                      <stop offset="0.315506" stopColor="#84A1FF"/>
                      <stop offset="1" stopColor="#00A7EF"/>
                    </linearGradient>
                    <linearGradient id="paint3_linear_upload" x1="173.254" y1="21.1174" x2="172.434" y2="31.7136" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3A4EE2"/>
                      <stop offset="1" stopColor="#3A4EE2" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="paint4_linear_upload" x1="101.669" y1="45.0005" x2="111.823" y2="144.969" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white" stopOpacity="0.1"/>
                      <stop offset="1" stopColor="white"/>
                    </linearGradient>
                    <linearGradient id="paint5_linear_upload" x1="101.5" y1="65.0005" x2="101.5" y2="126" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white"/>
                      <stop offset="1" stopColor="white" stopOpacity="0"/>
                    </linearGradient>
                    <clipPath id="clip0_upload">
                      <path d="M0 24C0 16.5449 0 12.8174 1.21793 9.87706C2.84183 5.95662 5.95662 2.84183 9.87706 1.21793C12.8174 0 16.5449 0 24 0H180C187.455 0 191.183 0 194.123 1.21793C198.043 2.84183 201.158 5.95662 202.782 9.87706C204 12.8174 204 16.5449 204 24V156C204 163.455 204 167.183 202.782 170.123C201.158 174.043 198.043 177.158 194.123 178.782C191.183 180 187.455 180 180 180H24C16.5449 180 12.8174 180 9.87706 178.782C5.95662 177.158 2.84183 174.043 1.21793 170.123C0 167.183 0 163.455 0 156V24Z" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
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
                  <Video className="h-4 w-4 text-[#1DB3FB]" />
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
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[rgba(32,32,32,0.1)] border-t-[#1DB3FB]" />
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
                    <Video className="h-4 w-4 text-[#1DB3FB]" />
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
