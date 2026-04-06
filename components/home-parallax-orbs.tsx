"use client";

export default function HomeParallaxOrbs() {
  return (
    <>
      <div className="home-orb pointer-events-none absolute -left-20 top-24 hidden h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl md:block md:motion-safe:animate-[floatSlow_20s_ease-in-out_infinite]" />
      <div className="home-orb pointer-events-none absolute -right-14 top-40 hidden h-56 w-56 rounded-full bg-sky-500/10 blur-3xl lg:block lg:motion-safe:animate-[floatWide_24s_ease-in-out_infinite]" />
      <div className="home-orb pointer-events-none absolute left-1/3 top-[-100px] hidden h-32 w-32 rounded-full bg-violet-500/7 blur-3xl xl:block xl:motion-safe:animate-[floatSlow_26s_ease-in-out_infinite]" />
    </>
  );
}
