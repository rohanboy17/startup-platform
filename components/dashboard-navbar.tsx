"use client";

import { motion } from "framer-motion";

export default function DashboardNavbar() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 md:mb-10">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pr-3 text-2xl font-semibold leading-tight md:text-3xl"
      >
        Admin Overview
      </motion.h1>
    </div>
  );
}
