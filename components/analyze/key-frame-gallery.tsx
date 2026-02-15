"use client";

import { useState } from "react";
import type { StoredKeyFrame } from "@/types/gait-analysis";

interface KeyFrameGalleryProps {
  keyFrames: StoredKeyFrame[];
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function KeyFrameGallery({ keyFrames }: KeyFrameGalleryProps) {
  if (!keyFrames || keyFrames.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold tracking-[-0.01rem] text-[#202020]">
        Key Frames
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {keyFrames.map((frame, i) => (
          <FrameCard key={i} frame={frame} index={i} />
        ))}
      </div>
    </div>
  );
}

function FrameCard({
  frame,
  index,
}: {
  frame: StoredKeyFrame;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(32,32,32,0.08)] bg-white shadow-sm">
      <div className="relative aspect-[3/4] w-full bg-gray-100">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
            <p className="text-sm font-medium text-gray-400">Frame unavailable</p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={frame.url}
            alt={frame.annotation}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}

        {/* Timestamp badge — top left */}
        <span className="absolute left-2 top-2 z-20 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {formatTimestamp(frame.timestamp_s)}
        </span>

        {/* Frame number badge — top right */}
        <span className="absolute right-2 top-2 z-20 rounded-md bg-[#1DB3FB]/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          #{index + 1}
        </span>

        {/* Bottom gradient overlay with annotation */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-10">
          <span className="mb-1 inline-block rounded-full bg-[#1DB3FB]/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            {frame.body_region.replace(/_/g, " ")}
          </span>
          <p className="text-[12px] leading-snug text-white/90">
            {frame.annotation}
          </p>
        </div>
      </div>
    </div>
  );
}
