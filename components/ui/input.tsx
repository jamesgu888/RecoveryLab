import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-[rgba(32,32,32,0.12)] bg-white px-3 py-2 text-sm text-[#202020] placeholder:text-[rgba(32,32,32,0.4)] focus:border-[#1DB3FB] focus:outline-none focus:ring-2 focus:ring-[#1DB3FB]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
