"use client";
// Cycles through staged messages with cross-fade. Not a spinner.
// Cycle stops on the last message and stays there while work continues.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function StagedLoader({
  messages,
  intervalMs = 1800,
  showStillWorkingAfterMs = 6000,
}: {
  messages: string[];
  intervalMs?: number;
  showStillWorkingAfterMs?: number;
}) {
  const [i, setI] = useState(0);
  const [stillWorking, setStillWorking] = useState(false);

  useEffect(() => {
    setI(0);
    setStillWorking(false);
    if (messages.length <= 1) return;
    const t = setInterval(() => {
      setI((n) => Math.min(n + 1, messages.length - 1));
    }, intervalMs);
    const stw = setTimeout(() => setStillWorking(true), showStillWorkingAfterMs);
    return () => {
      clearInterval(t);
      clearTimeout(stw);
    };
  }, [messages, intervalMs, showStillWorkingAfterMs]);

  const msg = messages[i] ?? messages[0] ?? "Working…";

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          className="font-display text-2xl md:text-3xl text-ink text-center"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40, "WONK" 0' }}
        >
          {msg}
        </motion.p>
      </AnimatePresence>
      {stillWorking && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-xs uppercase tracking-widest text-muted"
        >
          still working…
        </motion.p>
      )}
    </div>
  );
}
