"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function DashboardNavbar() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 md:mb-10">
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="pr-3 text-2xl font-semibold leading-tight md:text-3xl"
      >
        Admin Overview
      </motion.h1>
    </div>
  );
}
