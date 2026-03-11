"use client";

export default function HomeParallaxOrbs() {
  return (
    <>
      <div className="home-orb pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-emerald-400/12 blur-3xl motion-safe:animate-[floatSlow_16s_ease-in-out_infinite]" />
      <div className="home-orb pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-sky-500/12 blur-3xl motion-safe:animate-[floatWide_20s_ease-in-out_infinite]" />
      <div className="home-orb pointer-events-none absolute left-1/3 top-[-100px] hidden h-40 w-40 rounded-full bg-violet-500/8 blur-3xl motion-safe:block motion-safe:animate-[floatSlow_22s_ease-in-out_infinite]" />
    </>
  );
}
