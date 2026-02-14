"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import GoogleAuthButton from "@/components/auth/google-auth-button";
import { signUp, signInWithGoogle } from "@/lib/firebase-auth";

export default function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createUserDoc = async (uid: string, userEmail: string) => {
    await setDoc(doc(db, "users", uid), {
      email: userEmail,
      created_at: new Date().toISOString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const cred = await signUp(email, password);
      await createUserDoc(cred.user.uid, cred.user.email || email);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create account.";
      if (message.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      await createUserDoc(cred.user.uid, cred.user.email || "");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-up failed.";
      if (!message.includes("popup-closed")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#202020]">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-[#202020]"
        >
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg border border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] text-sm font-semibold text-white shadow-[0_0_1px_3px_#494949_inset,0_6px_5px_0_rgba(0,0,0,0.55)_inset] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <div className="relative my-2 flex items-center">
        <div className="flex-1 border-t border-[rgba(32,32,32,0.08)]" />
        <span className="px-3 text-xs text-[rgba(32,32,32,0.4)]">or</span>
        <div className="flex-1 border-t border-[rgba(32,32,32,0.08)]" />
      </div>

      <GoogleAuthButton onClick={handleGoogle} disabled={loading} label="Sign up with Google" />
    </form>
  );
}
