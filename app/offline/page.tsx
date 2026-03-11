import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_40%),#020617] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl shadow-black/30 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Offline Mode</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">You are offline</h1>
        <p className="mt-3 text-sm text-white/70">
          Network connection is unavailable. Reconnect to continue with live dashboards and campaign actions.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/15"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}

