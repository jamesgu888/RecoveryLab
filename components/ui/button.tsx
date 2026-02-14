import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent border-none ring-0 focus:ring-0 focus:ring-offset-0 focus:outline-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "modern-outline": "flex flex-row items-center justify-center gap-1 bg-white shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)] rounded-[24px] hover:shadow-[0px_4px_8px_-1px_rgba(1,65,99,0.12)] hover:border-[rgba(32,32,32,0.12)] transition-shadow font-normal text-base",
        "modern-primary": "text-white font-semibold flex items-center justify-center transition-all duration-200 cursor-pointer text-sm rounded-[11713.058px] border-[1.054px] border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] shadow-[0_0_1.054px_3.163px_#494949_inset,0_6.325px_5.271px_0_rgba(0,0,0,0.55)_inset] hover:opacity-90",
        "modern-dark": "flex flex-row items-center gap-1 bg-[#202020] text-white shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)] hover:bg-[#303030] transition-colors rounded-[24px] text-base font-normal",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "modern-sm": "h-6 p-2",
        "modern-md": "h-[2.125rem] px-4",
        "modern-lg": "h-[2.375rem] px-4",
        "modern-xl": "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
