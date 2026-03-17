"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    const data = (await res.json()) as { message?: string; error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to send reset link");
      return;
    }

    setMessage(
      data.message ||
        "If the account exists, a reset link has been sent to your email."
    );
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
              <h1 className="mt-2 text-2xl font-semibold">Forgot Password</h1>
              <p className="mt-2 text-sm text-white/65">
                Enter your email or mobile number and we will send a password reset link.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or mobile number"
                required
                className="h-11 border-white/15 bg-white/5"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90"
              >
                {loading ? "Sending..." : "Send Reset Link"}
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
