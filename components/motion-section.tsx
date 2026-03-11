"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function MotionSection({ children, className, delay = 0 }: MotionSectionProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
