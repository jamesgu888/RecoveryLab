import * as React from "react";
import { cn } from "@/lib/utils";

function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        className,
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3D8CFA] to-[#8BC6FB]">
        <span className="text-base font-bold text-white">G</span>
      </div>
      <span className="text-xl font-bold tracking-[-0.02em] text-[#202020]">
        GaitGuard
      </span>
    </div>
  );
}

export default Logo;
