"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Eye, User, ArrowLeftRight } from "lucide-react";
import { getBodyPartsForGait } from "@/lib/gait-body-parts";
import type { NvidiaVLMAnalysis } from "@/types/gait-analysis";
import type { FC } from "react";
import type { BodyComponentProps, PartsInput } from "@darshanpatel2608/human-body-react";

const SEVERITY_COLORS = {
  high: { fill: "#EF4444", stroke: "#DC2626" },
  medium: { fill: "#F59E0B", stroke: "#D97706" },
  low: { fill: "#93C5FD", stroke: "#60A5FA" },
  good: { fill: "#1DB3FB", stroke: "#0EA5E9" },
};

const ALL_BODY_PARTS: (keyof PartsInput)[] = [
  "head", "chest", "stomach",
  "left_shoulder", "right_shoulder",
  "left_arm", "right_arm",
  "left_hand", "right_hand",
  "left_leg_upper", "right_leg_upper",
  "left_leg_lower", "right_leg_lower",
  "left_foot", "right_foot",
];

interface BodyObservationMapProps {
  visual_analysis: NvidiaVLMAnalysis;
}

function ObservationCard({
  title,
  icon,
  items,
  variant = "default",
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  variant?: "default" | "warning";
}) {
  if (items.length === 0) return null;

  return (
    <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            variant === "warning"
              ? "bg-amber-50"
              : "bg-gradient-to-b from-[#E0F5FF] to-white"
          )}
        >
          {icon}
        </div>
        <h4 className="text-sm font-bold tracking-[-0.01rem] text-[#202020]">
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm leading-[160%] text-[rgba(32,32,32,0.75)]"
          >
            <span
              className={cn(
                "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                variant === "warning" ? "bg-amber-500" : "bg-[#1DB3FB]"
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InteractiveBody({ gaitType, severityScore, allObservations }: { gaitType: string; severityScore?: number; allObservations?: string[] }) {
  const [LoadedBody, setLoadedBody] = useState<FC<BodyComponentProps> | null>(null);

  useEffect(() => {
    import("@darshanpatel2608/human-body-react")
      .then((mod) => setLoadedBody(() => mod.BodyComponent))
      .catch(console.error);
  }, []);

  const partsInput = useMemo(() => {
    const result: PartsInput = {};
    for (const part of ALL_BODY_PARTS) {
      result[part] = { show: true, selected: false, clickable: false };
    }
    return result;
  }, []);

  const bodyParts = getBodyPartsForGait(gaitType, severityScore, allObservations);

  const severityCSS = useMemo(() => {
    const rules: string[] = [];
    for (const id of bodyParts.good) {
      rules.push(`.gait-body-wrapper #${id} { fill: ${SEVERITY_COLORS.good.fill} !important; stroke: ${SEVERITY_COLORS.good.stroke} !important; }`);
    }
    for (const id of bodyParts.low) {
      rules.push(`.gait-body-wrapper #${id} { fill: ${SEVERITY_COLORS.low.fill} !important; stroke: ${SEVERITY_COLORS.low.stroke} !important; }`);
    }
    for (const id of bodyParts.medium) {
      rules.push(`.gait-body-wrapper #${id} { fill: ${SEVERITY_COLORS.medium.fill} !important; stroke: ${SEVERITY_COLORS.medium.stroke} !important; }`);
    }
    for (const id of bodyParts.high) {
      rules.push(`.gait-body-wrapper #${id} { fill: ${SEVERITY_COLORS.high.fill} !important; stroke: ${SEVERITY_COLORS.high.stroke} !important; }`);
    }
    return rules.join("\n");
  }, [bodyParts]);

  if (!LoadedBody) {
    return (
      <div className="flex items-center justify-center" style={{ width: 240, height: 530 }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1DB3FB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="gait-body-wrapper">
      <style dangerouslySetInnerHTML={{ __html: severityCSS }} />
      <LoadedBody partsInput={partsInput} height="530px" width="240px" />
    </div>
  );
}

export default function BodyObservationMap({
  visual_analysis,
}: BodyObservationMapProps) {
  return (
    <div className="space-y-4">
      {/* Visual Observations — full width top */}
      <ObservationCard
        title="Visual Observations"
        icon={<Eye className="h-4 w-4 text-[#1DB3FB]" />}
        items={visual_analysis.visual_observations}
      />

      {/* Middle row: Left Side | BIG Body | Right Side */}
      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Left Side card */}
        <div className="order-2 md:order-1">
          <ObservationCard
            title="Left Side"
            icon={<User className="h-4 w-4 text-[#1DB3FB]" />}
            items={visual_analysis.left_side_observations}
          />
        </div>

        {/* Body figure — large centerpiece */}
        <div className="order-1 flex flex-col items-center md:order-2">
          <InteractiveBody
            gaitType={visual_analysis.gait_type}
            severityScore={visual_analysis.severity_score}
            allObservations={[
              ...visual_analysis.visual_observations,
              ...visual_analysis.left_side_observations,
              ...visual_analysis.right_side_observations,
            ]}
          />

          {/* Color legend */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-[rgba(32,32,32,0.55)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.good.fill }} />
              Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.high.fill }} />
              Most Affected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.medium.fill }} />
              Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.low.fill }} />
              Mild
            </span>
          </div>
        </div>

        {/* Right Side card */}
        <div className="order-3">
          <ObservationCard
            title="Right Side"
            icon={<User className="h-4 w-4 text-[#1DB3FB]" />}
            items={visual_analysis.right_side_observations}
          />
        </div>
      </div>

      {/* Asymmetries — only show when real asymmetries exist */}
      {visual_analysis.asymmetries.some(
        (a) => !/no (significant|notable|major|obvious)\b|symmetrical|symmetric|equally|equal\b|appears similar|relatively balanced/i.test(a)
      ) && (
        <ObservationCard
          title="Asymmetries"
          icon={<ArrowLeftRight className="h-4 w-4 text-amber-500" />}
          items={visual_analysis.asymmetries.filter(
            (a) => !/no (significant|notable|major|obvious)\b|symmetrical|symmetric|equally|equal\b|appears similar|relatively balanced/i.test(a)
          )}
          variant="warning"
        />
      )}
    </div>
  );
}
