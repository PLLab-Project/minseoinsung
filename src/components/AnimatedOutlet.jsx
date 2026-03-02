import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function AnimatedOutlet() {
  const location = useLocation();
  const reduce = useReducedMotion();

  const overlayDuration = reduce ? 0 : 0.7;
  const contentDelay = reduce ? 0 : 0.18;

  const pageVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        delay: contentDelay,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={`overlay-${location.pathname}`}
        className="fixed inset-0 z-[60] pointer-events-none bg-slate-950"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: overlayDuration, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        key={`page-${location.pathname}`}
        variants={pageVariants}
        initial={reduce ? false : "hidden"}
        animate={reduce ? false : "show"}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
