"use client";

import { useState } from "react";
import { ChevronDown, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/types/gait-analysis";

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  onAnalyzeForm?: (exercise: Exercise) => void;
}

export default function ExerciseCard({ exercise, index, onAnalyzeForm }: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Number badge - dark gradient circle like step indicators */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.054px] border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] shadow-[0_0_1.054px_3.163px_#494949_inset,0_6.325px_5.271px_0_rgba(0,0,0,0.55)_inset]">
          <span className="text-sm font-bold text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1">
          <h4 className="text-lg font-bold leading-tight tracking-[-0.01rem] text-[#202020]">
            {exercise.name}
          </h4>
          <p className="mt-0.5 text-sm font-medium text-gradient">
            {exercise.target}
          </p>
        </div>
      </div>

      {/* Pills: sets/reps and frequency */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#202020] shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)]">
          {exercise.sets_reps}
        </span>
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#202020] shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)]">
          {exercise.frequency}
        </span>
      </div>

      {/* Collapsible instructions */}
      <div className="mt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-[#202020] transition-colors hover:bg-[rgba(32,32,32,0.03)]"
        >
          <span>Instructions</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[rgba(32,32,32,0.5)] transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ol className="mt-2 space-y-2 pl-1">
            {exercise.instructions.map((instruction, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm leading-[160%] text-[rgba(32,32,32,0.75)]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(32,32,32,0.05)] text-[10px] font-semibold text-[rgba(32,32,32,0.5)]">
                  {i + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {onAnalyzeForm && (
        <div className="mt-4 border-t border-[rgba(32,32,32,0.06)] pt-4">
          <Button
            variant="modern-outline"
            size="modern-lg"
            className="w-full gap-2"
            onClick={() => onAnalyzeForm(exercise)}
          >
            <Camera className="h-4 w-4" />
            Analyze My Form
          </Button>
        </div>
      )}

    </div>
  );
}
