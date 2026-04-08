"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { usePerformanceReducedMotion } from "@/lib/use-performance-reduced-motion";

export default function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = usePerformanceReducedMotion();

  if (reduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      {children}
    </motion.div>
  );
}
