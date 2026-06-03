"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface NebulaSplashProps {
  /** Callback quand l'utilisateur clique pour entrer */
  onDismiss: () => void;
}

/**
 * Splash d'amorce premium : ambiance "night gastronomique" aubergine,
 * titre serif italic geant en gradient or -> rose, particules rose vif.
 * Click anywhere ou touche clavier (Enter / Space) -> dismiss.
 */
export default function NebulaSplash({ onDismiss }: NebulaSplashProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[9999] flex cursor-pointer flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(160deg, #1A0A24 0%, #2A1338 55%, #3A2050 100%)",
        }}
      >
        {/* Glow magenta / violet radial pour la profondeur */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at center, rgba(139,58,106,0.35) 0%, rgba(107,45,92,0.18) 35%, rgba(26,10,36,0) 70%, rgba(26,10,36,0.85) 100%)",
          }}
        />

        {/* Texture noise tres subtile */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Particules rose vif */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px w-px rounded-full"
              style={{
                top: `${(i * 37) % 100}%`,
                left: `${(i * 71) % 100}%`,
                background: i % 3 === 0 ? "#E8C088" : "#F4B5A6",
                boxShadow:
                  i % 3 === 0
                    ? "0 0 6px rgba(232, 192, 136, 0.8)"
                    : "0 0 5px rgba(244, 181, 166, 0.7)",
              }}
              animate={{
                opacity: [0.2, 0.95, 0.2],
              }}
              transition={{
                duration: 2 + (i % 4),
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Contenu central */}
        <div className="relative z-10 flex flex-col items-center px-8 text-center">
          {/* Kicker eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-8 text-[0.65rem] font-medium uppercase tracking-[0.5em]"
            style={{ color: "var(--rose-poudre)" }}
          >
            — Édition Première — 2026 —
          </motion.div>

          {/* Titre principal — gradient or -> rose */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 1.2,
              delay: 0.6,
              ease: [0.25, 0, 0, 1],
            }}
            className="font-serif text-[clamp(4rem,11vw,9rem)] italic leading-[0.92] tracking-[-0.04em]"
            style={{
              background:
                "linear-gradient(135deg, #F4B5A6 0%, #E8A89F 35%, #D4A574 70%, #E8C088 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              filter:
                "drop-shadow(0 0 40px rgba(232, 168, 159, 0.45)) drop-shadow(0 4px 30px rgba(0, 0, 0, 0.4))",
            }}
          >
            Apollon
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="mt-4 font-serif text-lg italic sm:text-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            La cuisine du monde, à portée d&apos;un geste.
          </motion.p>

          {/* Divider */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 80, opacity: 1 }}
            transition={{ duration: 1, delay: 1.8 }}
            className="mt-10 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #D4A574 50%, transparent 100%)",
            }}
          />

          {/* CTA enter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.2 }}
            className="mt-12 flex items-center gap-4"
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-[0.7rem] font-medium uppercase tracking-[0.4em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              <span style={{ color: "var(--or-bright)" }}>●</span>{" "}
              <span className="mx-3">Cliquez n&apos;importe où pour entrer</span>{" "}
              <span style={{ color: "var(--or-bright)" }}>●</span>
            </motion.span>
          </motion.div>
        </div>

        {/* Footer copyright bas */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.4em]"
          style={{ color: "rgba(248, 242, 234, 0.4)" }}
        >
          © 2026 Apollon — un carnet de cuisine
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
