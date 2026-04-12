"use client";

import { motion, type Variants } from "framer-motion";
import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePerformanceReducedMotion } from "@/lib/use-performance-reduced-motion";

type MotionStaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type MotionItemProps = {
  children: ReactNode;
  className?: string;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: (delay = 0) => ({
    opacity: 1,
    transition: {
      delay,
      staggerChildren: 0.08,
    },
  }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const MotionStagger = forwardRef<HTMLDivElement, MotionStaggerProps>(function MotionStagger(
  { children, className, delay = 0 },
  ref
) {
  const reduceMotion = usePerformanceReducedMotion();

  if (reduceMotion) {
    return (
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
});

export function MotionItem({ children, className }: MotionItemProps) {
  const reduceMotion = usePerformanceReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={item}>
      {children}
    </motion.div>
  );
}
