"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Bug } from "lucide-react";
import type { DebugInfo } from "@/types/gait-analysis";

interface DebugPanelProps {
  gridPreview: string | null;
  debugInfo: DebugInfo | null;
  errorMessage?: string;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[rgba(32,32,32,0.1)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-3 text-left text-sm font-medium text-[#202020] hover:text-[rgba(32,32,32,0.75)]"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {title}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function DebugPanel({
  gridPreview,
  debugInfo,
  errorMessage,
}: DebugPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-8 rounded-[10px] border border-orange-200 bg-orange-50/50 p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Bug className="h-4 w-4 text-orange-600" />
        <span className="text-sm font-semibold text-orange-800">
          Debug Panel
        </span>
        {open ? (
          <ChevronDown className="ml-auto h-4 w-4 text-orange-600" />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-orange-600" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-0">
          {/* Error */}
          {errorMessage && (
            <CollapsibleSection title="Error Message" defaultOpen>
              <pre className="overflow-x-auto rounded bg-red-100 p-3 text-xs text-red-800">
                {errorMessage}
              </pre>
            </CollapsibleSection>
          )}

          {/* Grid Image Sent to VLM */}
          {gridPreview && (
            <CollapsibleSection title="Grid Image Sent to VLM" defaultOpen>
              <div className="space-y-2">
                <p className="text-xs text-[rgba(32,32,32,0.6)]">
                  This is the composite 4x4 grid image that was sent to the VLM
                  for analysis. Size:{" "}
                  {Math.round(gridPreview.length / 1024)} KB
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gridPreview}
                  alt="Grid sent to VLM"
                  className="w-full rounded border border-[rgba(32,32,32,0.1)]"
                />
              </div>
            </CollapsibleSection>
          )}

          {debugInfo && (
            <>
              {/* VLM Request Info */}
              <CollapsibleSection title="VLM Request" defaultOpen>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-[rgba(32,32,32,0.6)]">Endpoint:</span>
                    <span className="font-mono text-[#202020] break-all">
                      {debugInfo.vlm_endpoint || "N/A"}
                    </span>
                    <span className="text-[rgba(32,32,32,0.6)]">Model:</span>
                    <span className="font-mono text-[#202020]">
                      {debugInfo.vlm_model || "N/A"}
                    </span>
                    <span className="text-[rgba(32,32,32,0.6)]">Grid Size:</span>
                    <span className="font-mono text-[#202020]">
                      {debugInfo.grid_size_kb
                        ? `${debugInfo.grid_size_kb} KB`
                        : "N/A"}
                    </span>
                    <span className="text-[rgba(32,32,32,0.6)]">Status:</span>
                    <span className="font-mono text-[#202020]">
                      {debugInfo.vlm_status ?? "N/A"}
                    </span>
                    <span className="text-[rgba(32,32,32,0.6)]">Duration:</span>
                    <span className="font-mono text-[#202020]">
                      {debugInfo.vlm_duration_ms
                        ? `${debugInfo.vlm_duration_ms}ms`
                        : "N/A"}
                    </span>
                  </div>
                  {debugInfo.vlm_prompt && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-[rgba(32,32,32,0.6)]">
                        Prompt sent:
                      </p>
                      <pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-[#202020]">
                        {debugInfo.vlm_prompt}
                      </pre>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* VLM Raw Response */}
              <CollapsibleSection title="VLM Raw Response" defaultOpen>
                <pre className="max-h-96 overflow-auto rounded bg-white p-3 text-xs text-[#202020] whitespace-pre-wrap break-words">
                  {debugInfo.vlm_raw_response || "No response captured"}
                </pre>
              </CollapsibleSection>

              {/* Coaching Request Info */}
              {debugInfo.coaching_model && (
                <CollapsibleSection title="Coaching Request">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-[rgba(32,32,32,0.6)]">Model:</span>
                      <span className="font-mono text-[#202020]">
                        {debugInfo.coaching_model}
                      </span>
                      <span className="text-[rgba(32,32,32,0.6)]">Duration:</span>
                      <span className="font-mono text-[#202020]">
                        {debugInfo.coaching_duration_ms
                          ? `${debugInfo.coaching_duration_ms}ms`
                          : "N/A"}
                      </span>
                    </div>
                    {debugInfo.coaching_prompt && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[rgba(32,32,32,0.6)]">
                          Prompt sent:
                        </p>
                        <pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-[#202020]">
                          {debugInfo.coaching_prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Coaching Raw Response */}
              {debugInfo.coaching_raw_response && (
                <CollapsibleSection title="Coaching Raw Response">
                  <pre className="max-h-96 overflow-auto rounded bg-white p-3 text-xs text-[#202020] whitespace-pre-wrap break-words">
                    {debugInfo.coaching_raw_response}
                  </pre>
                </CollapsibleSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
