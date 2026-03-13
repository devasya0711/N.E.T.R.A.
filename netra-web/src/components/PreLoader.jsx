import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const LETTERS = [
  { char: "N", word: "Networked" },
  { char: "E", word: "Edge" },
  { char: "T", word: "Tracking" },
  { char: "R", word: "Road" },
  { char: "A", word: "Anomalies" },
];

const letterVariant = {
  hidden: { opacity: 0, scale: 1.5, y: 30 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.35,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const wordVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.35 + 0.25,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

const dotVariant = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.35 + 0.15,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

const scanlineVariant = {
  hidden: { top: "-4px" },
  visible: {
    top: "100%",
    transition: { delay: 0.2, duration: 2.2, ease: "linear" },
  },
};

export default function PreLoader({ onComplete }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const total = LETTERS.length * 350 + 600 + 1000;
    const timer = setTimeout(() => setExiting(true), total);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!exiting && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "#000000" }}
        >
          {/* Background video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.35 }}
            src="/pothole-hackathon.mp4"
          />
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />

          {/* Scanline */}
          <motion.div
            variants={scanlineVariant}
            initial="hidden"
            animate="visible"
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            }}
          />

          <div className="relative flex flex-col items-center">
            <div className="flex items-baseline">
              {LETTERS.map((l, i) => (
                <div key={l.char} className="flex items-baseline">
                  <motion.span
                    custom={i}
                    variants={letterVariant}
                    initial="hidden"
                    animate="visible"
                    className="text-6xl sm:text-8xl lg:text-9xl font-black select-none"
                    style={{ fontFamily: '"Inter", system-ui, sans-serif', color: "#ffffff" }}
                  >
                    {l.char}
                  </motion.span>
                  <motion.span
                    custom={i}
                    variants={dotVariant}
                    initial="hidden"
                    animate="visible"
                    className="text-5xl sm:text-7xl lg:text-8xl font-black select-none"
                    style={{
                      fontFamily: '"Inter", system-ui, sans-serif',
                      color: "#f59e0b",
                      marginRight: i < LETTERS.length - 1 ? "0.15em" : "0",
                    }}
                  >
                    .
                  </motion.span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 sm:gap-8 mt-3">
              {LETTERS.map((l, i) => (
                <motion.span
                  key={l.word}
                  custom={i}
                  variants={wordVariant}
                  initial="hidden"
                  animate="visible"
                  className="text-[10px] sm:text-sm tracking-[0.2em] uppercase font-semibold"
                  style={{ fontFamily: '"Inter", system-ui, sans-serif', color: '#cbd5e1' }}
                >
                  {l.word}
                  {i === 2 && (
                    <span className="ml-4 sm:ml-8 tracking-[0.2em] font-semibold">for</span>
                  )}
                </motion.span>
              ))}
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: LETTERS.length * 0.35 + 0.5, duration: 0.6 }}
            className="absolute bottom-16 text-xs sm:text-sm tracking-[0.4em] uppercase font-semibold"
            style={{ fontFamily: '"Inter", system-ui, sans-serif', color: '#94a3b8' }}
          >
            Road Intelligence System
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: LETTERS.length * 0.35 + 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 h-0.5 w-48 origin-left"
            style={{
              background: "linear-gradient(90deg, transparent, #ffffff, #f59e0b, transparent)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
