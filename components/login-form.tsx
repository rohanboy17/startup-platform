"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm({ registered }: { registered: boolean }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
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

  function resetAdmin2faState() {
    if (!needsAdmin2fa) return;
    setNeedsAdmin2fa(false);
    setOtpSent(false);
    setOtp("");
    setRecoveryCode("");
    setChallengeId("");
  }

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
        identifier: identifier.trim(),
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
        identifier: identifier.trim(),
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

      setError("Invalid email/mobile or password");
      return;
    }

    const result = await signIn("credentials", {
      identifier: identifier.trim(),
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
        setError("Invalid email/mobile or password");
        return;
      }
      setError("Invalid email/mobile or password");
      return;
    }

    setLoading(false);
    router.replace(result?.url || "/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_100%_10%,rgba(56,189,248,0.14),transparent_40%)] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_100%_10%,rgba(56,189,248,0.2),transparent_40%),linear-gradient(to_bottom,#020617,#020617)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[-60px] top-20 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, -14, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[-80px] top-40 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl"
        animate={{ x: [0, -16, 0], y: [0, 12, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="hidden rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-8 backdrop-blur-xl lg:block"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-300/80">Secure Login</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">Welcome back to your control center.</h2>
          <p className="mt-4 text-sm text-foreground/70">
            Access campaigns, payouts, and moderation with account protection and admin-grade 2FA.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Role-based access with protected routes",
              "Admin 2FA with OTP or recovery codes",
              "IP and security event monitoring",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground/80">
                <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={error ? { opacity: 1, y: 0, scale: 1, x: [0, -7, 7, -5, 5, 0] } : { opacity: 1, y: 0, scale: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="overflow-hidden rounded-3xl border-foreground/15 bg-foreground/[0.04] shadow-[0_20px_80px_-30px_rgba(16,185,129,0.28)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-300/80">Welcome Back</p>
                <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
                <p className="text-sm text-foreground/65">Use your email or mobile number with password to continue.</p>
              </motion.div>

              {registered ? (
                <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  Account created. You can sign in now.
                </p>
              ) : null}

              <motion.form
                className="space-y-4"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <Input
                  type="text"
                  placeholder="Email or mobile number"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    resetAdmin2faState();
                  }}
                  required
                  autoComplete="username"
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-emerald-300/70 focus-visible:ring-emerald-300/20"
                />
                <p className="-mt-2 text-xs text-foreground/55">
                  Mobile login format examples: India <span className="text-foreground/80">+91987XXXX210</span>, US{" "}
                  <span className="text-foreground/80">+1415XXXX671</span>, UK{" "}
                  <span className="text-foreground/80">+4479XXXXX456</span>.
                </p>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    resetAdmin2faState();
                  }}
                  required
                  autoComplete="current-password"
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-emerald-300/70 focus-visible:ring-emerald-300/20"
                />
                <div className="-mt-1 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-foreground/70 underline underline-offset-4 transition hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                {needsAdmin2fa ? (
                  <div className="space-y-2 rounded-xl border border-foreground/10 bg-foreground/[0.04] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-foreground/65">Admin 2FA required</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={requestAdminOtp}
                        disabled={otpLoading || !identifier || !password}
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
                      className="h-10 border-foreground/15 bg-foreground/[0.04]"
                    />
                    <Input
                      type="text"
                      placeholder="Or recovery code (e.g., ABC12-34DEF)"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                      className="h-10 border-foreground/15 bg-foreground/[0.04]"
                    />
                    {otpSent ? <p className="text-xs text-emerald-300">OTP requested and ready.</p> : null}
                  </div>
                ) : null}
                <Button type="submit" className="h-11 w-full rounded-xl bg-foreground text-background hover:opacity-90" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </motion.form>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {info ? <p className="text-sm text-emerald-300">{info}</p> : null}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-xs text-foreground/70">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-300" /> Protected Auth</span>
                <span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-sky-500 dark:text-sky-300" /> Live Security</span>
              </div>

              <p className="text-sm text-foreground/60">
                New here?{" "}
                <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
