"use client";

import React, { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Calendar, FileText } from "lucide-react";

export default function RecoverAIAdminPage() {
  const [patientId, setPatientId] = useState("patient_123");
  const [phoneOrUserId, setPhoneOrUserId] = useState("+15123638422");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleSendDailyCheckin = async () => {
    setIsLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/poke/send_daily_checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, phone_or_user_id: phoneOrUserId }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWeeklySummary = async () => {
    setIsLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/poke/send_weekly_summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, phone_or_user_id: phoneOrUserId }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCheckin = async () => {
    setIsLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/recoverai/log_checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, pain: 3, did_exercise: true, notes: "Feeling good today" }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <div className="fade-in mb-10 text-center">
            <h2 className="h2-style text-[#202020]">
              RecoverAI <span className="text-gradient">Admin</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
              Test Poke automations and coaching tools.
            </p>
          </div>

          {/* Patient details */}
          <div className="platform-feature-card mb-6 rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
            <h3 className="mb-4 text-lg font-bold text-[#202020]">Patient Info</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#202020]">Patient ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-lg border border-[rgba(32,32,32,0.15)] px-4 py-2 text-sm text-[#202020]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#202020]">Phone / User ID</label>
                <input
                  type="text"
                  value={phoneOrUserId}
                  onChange={(e) => setPhoneOrUserId(e.target.value)}
                  className="w-full rounded border border-[rgba(32,32,32,0.15)] px-3 py-2 text-sm"
                  placeholder="+15123638422"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="platform-feature-card mb-6 rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
            <h3 className="mb-4 text-lg font-bold text-[#202020]">Actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="modern-primary"
                size="modern-lg"
                onClick={handleSendDailyCheckin}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Send Daily Check-in
              </Button>
              <Button
                variant="modern-primary"
                size="modern-lg"
                onClick={handleSendWeeklySummary}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Send Weekly Summary
              </Button>
              <Button
                variant="modern-outline"
                size="modern-lg"
                onClick={handleTestCheckin}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Test Log Check-in
              </Button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
              <h3 className="mb-3 text-lg font-bold text-[#202020]">Result</h3>
              
              {/* Try to parse and display message nicely if it's a mock Poke response */}
              {(() => {
                try {
                  const parsed = JSON.parse(result);
                  if (parsed.mock && parsed.data?.message) {
                    return (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                          <div className="text-sm font-semibold text-blue-900 mb-2">📱 Mock Message (would be sent to {parsed.data.to})</div>
                          <div className="whitespace-pre-wrap text-sm text-blue-800 bg-white rounded p-3 border border-blue-100">
                            {parsed.data.message}
                          </div>
                          <div className="mt-2 text-xs text-blue-600">
                            Message ID: {parsed.data.message_id} • Sent at: {new Date(parsed.data.sent_at).toLocaleString()}
                          </div>
                        </div>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">View raw JSON</summary>
                          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-800">{result}</pre>
                        </details>
                      </div>
                    );
                  }
                } catch (e) {
                  // Not JSON or doesn't have message, fall through to default
                }
                return <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-800">{result}</pre>;
              })()}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
