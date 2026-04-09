"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

type UsePerformanceReducedMotionOptions = {
  disableOnSmallScreens?: boolean;
};

export function usePerformanceReducedMotion(
  options: UsePerformanceReducedMotionOptions = {}
) {
  const prefersReducedMotion = useReducedMotion();
  const [reduced, setReduced] = useState(Boolean(prefersReducedMotion));
  const { disableOnSmallScreens = true } = options;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const connection = (navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    }).connection;

    const update = () => {
      const lowCoreDevice =
        typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
      setReduced(
        Boolean(
          prefersReducedMotion ||
            (disableOnSmallScreens && mediaQuery.matches) ||
            connection?.saveData ||
            lowCoreDevice
        )
      );
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [disableOnSmallScreens, prefersReducedMotion]);

  return reduced;
}
