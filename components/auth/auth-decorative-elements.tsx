import React from "react";

export default function AuthDecorativeElements() {
  return (
    <>
      {/* Top wave */}
      <svg
        className="pointer-events-none absolute top-0 left-0 w-full"
        viewBox="0 0 1440 200"
        fill="none"
        preserveAspectRatio="none"
        style={{ height: "200px" }}
      >
        <path
          d="M0 0h1440v120c-240 40-480 80-720 60S240 80 0 120V0z"
          fill="url(#wave-top)"
          fillOpacity="0.3"
        />
        <defs>
          <linearGradient id="wave-top" x1="0" y1="0" x2="1440" y2="200">
            <stop stopColor="#1DB3FB" stopOpacity="0.15" />
            <stop offset="1" stopColor="#84A1FF" stopOpacity="0.08" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bottom wave */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 160"
        fill="none"
        preserveAspectRatio="none"
        style={{ height: "160px" }}
      >
        <path
          d="M0 160h1440V60c-360 50-720 30-1080 60S360 60 0 100v60z"
          fill="url(#wave-bottom)"
          fillOpacity="0.25"
        />
        <defs>
          <linearGradient id="wave-bottom" x1="0" y1="160" x2="1440" y2="0">
            <stop stopColor="#E0F5FF" />
            <stop offset="1" stopColor="#F0FAFF" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
