"use client";

import React from "react";
import Link from "next/link";
import SignInForm from "@/components/auth/signin-form";

export default function LoginCard() {
  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[rgba(32,32,32,0.08)] bg-white shadow-[0px_4px_16px_-4px_rgba(1,65,99,0.12)]">
      {/* Gray header */}
      <div className="bg-[#f7f7f8] px-8 py-5 border-b border-[rgba(32,32,32,0.06)]">
        <h2 className="text-xl font-bold text-[#202020]">Log in</h2>
        <p className="mt-1 text-sm text-[rgba(32,32,32,0.6)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#1DB3FB] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* White content */}
      <div className="px-8 py-6">
        <SignInForm />
      </div>
    </div>
  );
}
