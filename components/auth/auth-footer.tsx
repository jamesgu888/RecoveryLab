import React from "react";
import Link from "next/link";

export default function AuthFooter() {
  return (
    <footer className="relative z-10 px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-[rgba(32,32,32,0.5)]">
          &copy; {new Date().getFullYear()} GaitGuard. All rights reserved.
        </p>
        <div className="flex gap-4">
          <Link
            href="/privacy-policy"
            className="text-xs text-[rgba(32,32,32,0.5)] hover:text-[#202020] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="text-xs text-[rgba(32,32,32,0.5)] hover:text-[#202020] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
