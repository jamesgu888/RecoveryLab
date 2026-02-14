"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import AuthPageLayout from "@/components/auth/auth-page-layout";
import SignupCard from "@/components/auth/signup-card";

export default function SignUpPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1DB3FB] border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthPageLayout>
      <SignupCard />
    </AuthPageLayout>
  );
}
