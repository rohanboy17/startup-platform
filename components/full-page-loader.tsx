export default function FullPageLoader({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(56,189,248,0.10),transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(56,189,248,0.12),transparent_60%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-2 border-foreground/15" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500 dark:border-t-emerald-400" />
          <span className="absolute inset-2 rounded-full bg-foreground/[0.03] backdrop-blur" />
        </div>
        <p className="text-sm text-foreground/70" aria-live="polite">
          {label}
        </p>
      </div>
    </div>
  );
}
