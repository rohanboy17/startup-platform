"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to reset password");
      return;
    }

    setMessage(data.message || "Password reset successful. You can sign in now.");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Card className="rounded-3xl border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Account Recovery
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Reset Password</h1>
              <p className="mt-2 text-sm text-white/65">
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                className="h-11 border-white/15 bg-white/5"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="h-11 border-white/15 bg-white/5"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>

            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <p className="text-sm text-white/60">
              Back to{" "}
              <Link href="/login" className="font-medium text-white underline underline-offset-4">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
