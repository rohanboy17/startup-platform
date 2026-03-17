"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

export function PublicPageShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  const tPublic = useTranslations("public");
  return (
    <main className="public-shell min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_95%_10%,rgba(56,189,248,0.18),transparent_35%),linear-gradient(to_bottom,#020617,#020617)] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_80px_-40px_rgba(16,185,129,0.6)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-300/80">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">{description}</p>
          {lastUpdated ? (
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">
              {tPublic("lastUpdated", { date: lastUpdated })}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/75 sm:text-[15px]">{children}</div>
    </section>
  );
}
