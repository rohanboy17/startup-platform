"use client";

import { useEffect, useMemo, useState } from "react";
import { usePerformanceReducedMotion } from "@/lib/use-performance-reduced-motion";

type MetricCounterProps = {
  value: number;
  formatter?: "number" | "inr" | "compact";
  durationMs?: number;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function MetricCounter({
  value,
  formatter = "number",
  durationMs = 1200,
}: MetricCounterProps) {
  const reduceMotion = usePerformanceReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);

  const formatValue = useMemo(() => {
    if (formatter === "inr") {
      return (val: number) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(val);
    }
    if (formatter === "compact") {
      return (val: number) =>
        new Intl.NumberFormat("en-IN", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(val);
    }
    return (val: number) => new Intl.NumberFormat("en-IN").format(val);
  }, [formatter]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(progress);
      const nextValue = Math.round(value * eased);
      setAnimatedValue(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  return <>{formatValue(reduceMotion ? value : animatedValue)}</>;
}
