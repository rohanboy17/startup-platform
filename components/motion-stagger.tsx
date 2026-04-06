"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function MotionStagger({ children, className, delay = 0 }: MotionStaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
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
}

export function MotionItem({ children, className }: MotionItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={item}>
      {children}
    </motion.div>
  );
}
