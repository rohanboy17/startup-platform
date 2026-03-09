"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm({ registered }: { registered: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsAdmin2fa, setNeedsAdmin2fa] = useState(false);
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function requestAdminOtp() {
    setOtpLoading(true);
    setError("");
    if (!needsAdmin2fa) {
      setInfo("");
    }

    const res = await fetch("/api/auth/admin-2fa/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    const raw = await res.text();
    const data = raw
      ? (JSON.parse(raw) as {
          error?: string;
          message?: string;
          challengeId?: string;
          devOtp?: string;
        })
      : {};
    setOtpLoading(false);

    if (!res.ok) {
      if (needsAdmin2fa) {
        setError(data.error || "Unable to send OTP");
      }
      return false;
    }

    setNeedsAdmin2fa(true);
    setChallengeId(data.challengeId || "");
    setOtpSent(true);
    setInfo(
      data.devOtp
        ? `Local dev OTP: ${data.devOtp} (SMTP not configured)`
        : "OTP sent to admin email. It expires shortly."
    );
    return true;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (!needsAdmin2fa) {
      const firstPass = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (firstPass && !firstPass.error) {
        setLoading(false);
        router.replace(firstPass.url || "/dashboard");
        router.refresh();
        return;
      }

      const otpTriggered = await requestAdminOtp();
      setLoading(false);
      if (otpTriggered) {
        setInfo("Admin 2FA required. Enter OTP or recovery code to continue.");
        return;
      }

      setError("Invalid email or password");
      return;
    }

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      otp: otp.trim(),
      challengeId: challengeId.trim(),
      recoveryCode: recoveryCode.trim(),
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result && result.error) {
      setLoading(false);
      if (result.error.includes("OTP_INVALID")) {
        setError("Invalid or expired OTP. Request a new code.");
        return;
      }
      if (result.error.includes("RECOVERY_CODE_INVALID")) {
        setError("Invalid or used recovery code.");
        return;
      }
      if (result.error.includes("CredentialsSignin")) {
        if (otp.trim() || recoveryCode.trim()) {
          setError("2FA verification failed. Request a new OTP or use a valid recovery code.");
          return;
        }
        setError("Invalid email or password");
        return;
      }
      setError("Invalid email or password");
      return;
    }

    setLoading(false);
    router.replace(result?.url || "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_48%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_40%),#0a0a0a] px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Card className="rounded-2xl border-white/15 bg-white/5 backdrop-blur-xl">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Sign In</h1>
              <p className="text-sm text-white/60">
                Access your dashboard and continue where you left off.
              </p>
            </div>

            {registered ? (
              <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Account created. You can sign in now.
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (needsAdmin2fa) {
                    setNeedsAdmin2fa(false);
                    setOtpSent(false);
                    setOtp("");
                    setRecoveryCode("");
                    setChallengeId("");
                  }
                }}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (needsAdmin2fa) {
                    setNeedsAdmin2fa(false);
                    setOtpSent(false);
                    setOtp("");
                    setRecoveryCode("");
                    setChallengeId("");
                  }
                }}
                required
              />
              {needsAdmin2fa ? (
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/65">Admin 2FA required</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={requestAdminOtp}
                      disabled={otpLoading || !email || !password}
                    >
                      {otpLoading ? "Sending..." : "Resend OTP"}
                    </Button>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Or recovery code (e.g., ABC12-34DEF)"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  />
                  {otpSent ? <p className="text-xs text-emerald-300">OTP requested and ready.</p> : null}
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {info ? <p className="text-sm text-emerald-300">{info}</p> : null}

            <p className="text-sm text-white/60">
              New here?{" "}
              <Link href="/register" className="text-white underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
