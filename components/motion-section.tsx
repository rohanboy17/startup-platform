"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePerformanceReducedMotion } from "@/lib/use-performance-reduced-motion";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function MotionSection({ children, className, delay = 0 }: MotionSectionProps) {
  const reduceMotion = usePerformanceReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
