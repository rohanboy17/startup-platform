"use client";

import { motion, type Variants } from "framer-motion";
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
      staggerChildren: 0.12,
    },
  }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export function MotionStagger({ children, className, delay = 0 }: MotionStaggerProps) {
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
  return (
    <motion.div className={cn(className)} variants={item}>
      {children}
    </motion.div>
  );
}
