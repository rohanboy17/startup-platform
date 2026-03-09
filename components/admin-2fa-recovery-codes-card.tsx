"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminTwoFactorRecoveryCodesCard({
  enabled,
  activeCount,
  usedCount,
  lastGeneratedAt,
}: {
  enabled: boolean;
  activeCount: number;
  usedCount: number;
  lastGeneratedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [codes, setCodes] = useState<string[]>([]);

  async function generateCodes() {
    setLoading(true);
    setMessage("");
    setCodes([]);

    const res = await fetch("/api/admin/security/2fa/recovery-codes", {
      method: "POST",
      credentials: "include",
    });

    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string; codes?: string[] }) : {};
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Failed to generate recovery codes");
      return;
    }

    setCodes(data.codes || []);
    setMessage(data.message || "Recovery codes generated");
    router.refresh();
  }

  function copyAll() {
    if (!codes.length) return;
    void navigator.clipboard.writeText(codes.join("\n"));
    setMessage("Recovery codes copied");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">Admin Recovery Codes</p>
      <p className="mt-1 text-xs text-white/55">Use these one-time codes if email OTP is unavailable.</p>
      <p className="mt-2 text-xs text-white/60">
        Active: {activeCount} | Used: {usedCount}
      </p>
      <p className="mt-1 text-xs text-white/55">
        {lastGeneratedAt ? `Last generated: ${new Date(lastGeneratedAt).toLocaleString()}` : "Never generated"}
      </p>

      <div className="mt-3 flex gap-2">
        <Button onClick={generateCodes} disabled={loading || !enabled}>
          {loading ? "Generating..." : "Generate New Codes"}
        </Button>
        <Button variant="outline" onClick={copyAll} disabled={!codes.length}>
          Copy
        </Button>
      </div>

      {!enabled ? <p className="mt-2 text-xs text-amber-300">Enable admin 2FA first.</p> : null}

      {codes.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {codes.map((code) => (
            <div key={code} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs">
              {code}
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
