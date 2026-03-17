"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchReferralCode = searchParams.get("ref")?.trim().toUpperCase() || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchReferralCode);
  const [role, setRole] = useState<"USER" | "BUSINESS">("USER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        mobile,
        password,
        role,
        referralCode: role === "USER" ? referralCode : undefined,
      }),
    });

    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || t("errors.failed"));
      return;
    }

    setMessage(t("messages.createdRedirecting"));
    setTimeout(() => {
      router.push("/login?registered=1");
    }, 800);
  }

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_100%_10%,rgba(56,189,248,0.14),transparent_40%)] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_100%_10%,rgba(56,189,248,0.2),transparent_40%),linear-gradient(to_bottom,#020617,#020617)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[-70px] top-16 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, -12, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[-90px] top-48 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 14, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="hidden rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-8 backdrop-blur-xl lg:block"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-500 dark:text-sky-300/80">
            {t("side.eyebrow")}
          </p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">{t("side.title")}</h2>
          <p className="mt-4 text-sm text-foreground/70">{t("side.subtitle")}</p>

          <div className="mt-8 space-y-3">
            {[
              t("side.bullets.unified"),
              t("side.bullets.mobileIdentity"),
              t("side.bullets.wallet"),
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
          <Card className="overflow-hidden rounded-3xl border-foreground/15 bg-foreground/[0.04] shadow-[0_20px_80px_-30px_rgba(56,189,248,0.24)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-500 dark:text-sky-300/80">
                  {t("card.eyebrow")}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">{t("card.title")}</h1>
                <p className="text-sm text-foreground/65">{t("card.subtitle")}</p>
              </motion.div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-foreground/10 bg-background/60 p-2 text-xs">
                <div className="rounded-lg bg-foreground/10 px-3 py-2 text-center font-medium text-foreground">1. Your details</div>
                <div className="rounded-lg bg-foreground/[0.04] px-3 py-2 text-center font-medium text-foreground/80">2. Account type</div>
              </div>

              <motion.form
                className="space-y-4"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <Input
                  placeholder={t("form.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-sky-300/70 focus-visible:ring-sky-300/20"
                />
                <Input
                  type="email"
                  placeholder={t("form.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-sky-300/70 focus-visible:ring-sky-300/20"
                />
                <Input
                  type="tel"
                  placeholder={t("form.mobile")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  autoComplete="tel"
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-sky-300/70 focus-visible:ring-sky-300/20"
                />
                <p className="-mt-2 text-xs text-foreground/55">
                  {t.rich("form.mobileHelp", {
                    india: "+91987XXXX210",
                    us: "+1415XXXX671",
                    uk: "+4479XXXXX456",
                    highlight: (chunks) => <span className="text-foreground/80">{chunks}</span>,
                  })}
                </p>
                <Input
                  type="password"
                  placeholder={t("form.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-sky-300/70 focus-visible:ring-sky-300/20"
                />
                <Input
                  placeholder={t("form.referral")}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="h-11 border-foreground/15 bg-foreground/[0.04] transition focus-visible:border-sky-300/70 focus-visible:ring-sky-300/20"
                  disabled={role !== "USER"}
                />
                <p className="-mt-2 text-xs text-foreground/55">
                  {t("form.referralHelp")}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setRole("USER")}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      role === "USER"
                        ? "border-foreground/70 bg-foreground text-background"
                        : "border-foreground/20 bg-foreground/[0.04] text-foreground/85 hover:bg-foreground/10"
                    }`}
                  >
                    <UserRound size={16} /> {t("roles.user")}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setRole("BUSINESS")}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                      role === "BUSINESS"
                        ? "border-foreground/70 bg-foreground text-background"
                        : "border-foreground/20 bg-foreground/[0.04] text-foreground/85 hover:bg-foreground/10"
                    }`}
                  >
                    <Building2 size={16} /> {t("roles.business")}
                  </motion.button>
                </div>

                <Button type="submit" className="h-11 w-full rounded-xl bg-foreground text-background hover:opacity-90" disabled={loading}>
                  {loading ? t("actions.creating") : t("actions.createAccount")}
                </Button>
              </motion.form>

              {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <p className="text-sm text-foreground/60">
                {t("footer.alreadyHave")}{" "}
                <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                  {t("footer.signIn")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
