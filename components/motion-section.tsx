"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function MotionSection({ children, className, delay = 0 }: MotionSectionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
