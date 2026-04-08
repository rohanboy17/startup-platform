"use client";

export default function HomeParallaxOrbs() {
  return (
    <>
      <div className="home-orb pointer-events-none absolute -left-20 top-24 hidden h-40 w-40 rounded-full bg-emerald-400/8 blur-2xl xl:block" />
      <div className="home-orb pointer-events-none absolute -right-14 top-40 hidden h-48 w-48 rounded-full bg-sky-500/8 blur-2xl 2xl:block" />
    </>
  );
}
