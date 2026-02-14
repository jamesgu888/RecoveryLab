"use client";

import React from "react";
import Logo from "@/components/logo";
import AuthDecorativeElements from "@/components/auth/auth-decorative-elements";
import AuthFooter from "@/components/auth/auth-footer";

interface AuthPageLayoutProps {
  children: React.ReactNode;
}

const features = [
  {
    title: "AI-Powered Analysis",
    description: "Upload a walking video and get instant gait analysis powered by advanced computer vision.",
  },
  {
    title: "Personalized Coaching",
    description: "Receive tailored exercises and rehabilitation plans based on your unique gait patterns.",
  },
  {
    title: "Track Your Progress",
    description: "Monitor your gait improvements over time with a dashboard of past analyses.",
  },
];

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #E0F5FF 0%, #F0FAFF 44.95%, #FFFFFF 100%)",
      }}
    >
      <AuthDecorativeElements />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header with logo */}
        <div className="px-5 py-5 sm:px-8 sm:py-6">
          <div className="mx-auto max-w-[1200px]">
            <Logo />
          </div>
        </div>

        {/* Main content: 2-column grid */}
        <div className="flex flex-1 items-center px-5 py-8 sm:px-8">
          <div className="mx-auto grid w-full max-w-[1200px] gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: marketing content */}
            <div className="hidden flex-col justify-center lg:flex">
              <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-[#202020]">
                Smart gait analysis,{" "}
                <span className="text-gradient">better movement</span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-[rgba(32,32,32,0.7)]">
                GaitGuard uses AI to analyze your walking patterns and provides
                personalized exercises to help you move better.
              </p>

              <div className="flex flex-col gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-[rgba(32,32,32,0.06)] bg-white/60 p-4 backdrop-blur-sm"
                  >
                    <h3 className="mb-1 text-sm font-bold text-[#202020]">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[rgba(32,32,32,0.6)]">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: auth card */}
            <div className="flex items-center justify-center lg:justify-end">
              {children}
            </div>
          </div>
        </div>

        <AuthFooter />
      </div>
    </div>
  );
}
