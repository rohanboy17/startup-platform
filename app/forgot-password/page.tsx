"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
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
      setError(data.error || t("errors.failed"));
      return;
    }

    setMessage(data.message || t("messages.sent"));
  }

  return (
    <div className="auth-shell min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Card className="rounded-3xl border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold">{t("title")}</h1>
              <p className="mt-2 text-sm text-white/65">
                {t("description")}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("identifierPlaceholder")}
                required
                className="h-11 border-white/15 bg-white/5"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90"
              >
                {loading ? t("actions.sending") : t("actions.send")}
              </Button>
            </form>

            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <p className="text-sm text-white/60">
              {t("backTo")}{" "}
              <Link href="/login" className="font-medium text-white underline underline-offset-4">
                {t("signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
