export default function FullPageLoader({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black px-6 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-2 border-white/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
        </div>
        <p className="text-sm text-white/70">{label}</p>
      </div>
    </div>
  );
}

