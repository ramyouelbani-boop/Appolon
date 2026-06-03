"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

interface Recipe {
  nom: string;
  origine: string;
  drapeau: string;
  temps_total: string;
  etapes: string[];
  astuce_chef?: string;
  // additional fields tolerated
  [key: string]: unknown;
}

/* ----------------------------------------------------------------------------
 * Mock fallback (dev convenience — used only if sessionStorage empty and
 * we want to allow direct visit during testing)
 * -------------------------------------------------------------------------- */

const MOCK_RECIPE: Recipe = {
  nom: "Tajine d'agneau aux abricots",
  origine: "Maroc",
  drapeau: "🇲🇦",
  temps_total: "1h30",
  etapes: [
    "Faire chauffer l'huile d'olive dans un tajine ou une cocotte en fonte. Y faire revenir l'agneau a feu vif jusqu'a coloration sur toutes les faces, environ 8 minutes.",
    "Ajouter les oignons emincés, l'ail et le gingembre. Laisser fondre doucement 5 minutes en remuant.",
    "Saupoudrer de cannelle, cumin et safran. Saler, poivrer. Bien enrober la viande des épices.",
    "Verser 30cl d'eau chaude, couvrir et laisser mijoter a feu doux pendant 1 heure. Remuer toutes les 15 minutes.",
    "Ajouter les abricots secs et le miel. Poursuivre la cuisson 20 minutes a découvert pour faire réduire la sauce.",
    "Au moment de servir, parsemer d'amandes grillées et de coriandre fraiche ciselée. Accompagner de semoule fine ou de pain marocain.",
  ],
  astuce_chef:
    "Pour un tajine encore plus parfumé, faites tremper les abricots 30 minutes dans de l'eau de fleur d'oranger avant de les incorporer.",
};

/* ----------------------------------------------------------------------------
 * Audio beep (base64 short tone) — discreet timer alert
 * -------------------------------------------------------------------------- */

function playBeep(): void {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.62);
    osc.onended = () => ctx.close();
  } catch {
    // noop
  }
}

/* ----------------------------------------------------------------------------
 * Confetti (very light Framer Motion based)
 * -------------------------------------------------------------------------- */

const CONFETTI_COLORS = ["#E8C088", "#F4B5A6", "#D4A574", "#E8A89F"];

function Confetti(): React.ReactElement {
  const pieces = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.4 + Math.random() * 0.9,
      rotate: Math.random() * 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{
            y: typeof window !== "undefined" ? window.innerHeight + 40 : 800,
            opacity: [0, 1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.8, 0.4, 1],
          }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TIMER_PRESETS: { label: string; minutes: number }[] = [
  { label: "1 min", minutes: 1 },
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
];

/* ----------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */

export default function CuisinePage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [missingRecipe, setMissingRecipe] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFlash, setTimerFlash] = useState(false);

  // Confetti at end
  const [showConfetti, setShowConfetti] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------- Recipe load -------------------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("currentRecipe");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Recipe;
        if (parsed && Array.isArray(parsed.etapes) && parsed.etapes.length > 0) {
          setRecipe(parsed);
          return;
        }
      } catch {
        // fall through
      }
    }

    // Dev convenience: if running standalone, seed mock so we can iterate.
    // But still surface the editorial empty-state for QA when explicitly
    // cleared.
    const isDev =
      typeof process !== "undefined" && process.env.NODE_ENV !== "production";
    if (isDev) {
      window.sessionStorage.setItem(
        "currentRecipe",
        JSON.stringify(MOCK_RECIPE),
      );
      setRecipe(MOCK_RECIPE);
    } else {
      setMissingRecipe(true);
    }
  }, []);

  /* ---------------------- Redirect when missing ---------------------- */

  useEffect(() => {
    if (!missingRecipe) return;
    const t = window.setTimeout(() => router.push("/compose"), 3000);
    return () => window.clearTimeout(t);
  }, [missingRecipe, router]);

  /* ---------------------- Timer countdown ---------------------------- */

  useEffect(() => {
    if (!timerRunning || timerSeconds === null) return;
    if (timerSeconds <= 0) return;
    const id = window.setInterval(() => {
      setTimerSeconds((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerSeconds]);

  // Detect end-of-timer
  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      playBeep();
      setTimerFlash(true);
      const t = window.setTimeout(() => setTimerFlash(false), 1200);
      return () => window.clearTimeout(t);
    }
  }, [timerSeconds, timerRunning]);

  const startTimer = (minutes: number) => {
    setTimerSeconds(minutes * 60);
    setTimerRunning(true);
  };
  const resetTimer = () => {
    setTimerSeconds(null);
    setTimerRunning(false);
  };

  /* ---------------------- Step navigation ---------------------------- */

  const totalSteps = recipe?.etapes.length ?? 0;
  const isLast = totalSteps > 0 && currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  const next = useCallback(() => {
    if (!recipe) return;
    if (isLast) {
      // Terminé
      setShowConfetti(true);
      window.setTimeout(() => {
        setShowConfetti(false);
        router.push("/recipe");
      }, 1800);
      return;
    }
    setDirection(1);
    setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
  }, [recipe, isLast, totalSteps, router]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const quit = useCallback(() => {
    router.push("/recipe");
  }, [router]);

  /* ---------------------- Keyboard nav ------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        quit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, quit]);

  /* ---------------------- Empty / missing state ---------------------- */

  if (missingRecipe) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center px-8 text-creme"
        style={{
          background:
            "linear-gradient(160deg, #1A0A24 0%, #2A1338 100%)",
        }}
      >
        <p className="mb-10 text-[0.62rem] uppercase tracking-[0.32em] text-creme/55">
          — Cuisine pas-à-pas
        </p>
        <h1
          className="max-w-3xl text-center font-serif italic leading-[1.05] text-creme"
          style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
        >
          &laquo; Aucune recette à cuisiner pour l&apos;instant. &raquo;
        </h1>
        <p className="mt-10 max-w-md text-center font-sans text-[0.95rem] leading-relaxed text-creme/60">
          Composez une première recette pour entrer en cuisine. Redirection
          dans quelques secondes…
        </p>
        <button
          onClick={() => router.push("/compose")}
          className="mt-12 inline-flex items-center gap-3 border border-creme/30 px-7 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-creme transition-colors duration-300 hover:border-terracotta hover:bg-terracotta"
        >
          <span>Composer une recette</span>
          <span aria-hidden>→</span>
        </button>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main
        className="flex min-h-screen items-center justify-center text-creme/55"
        style={{ background: "var(--bg-primary)" }}
      >
        <p className="text-[0.7rem] uppercase tracking-[0.32em]">Chargement…</p>
      </main>
    );
  }

  const stepText = recipe.etapes[currentStep] ?? "";
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  return (
    <main
      ref={stageRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden text-creme"
      style={{
        background:
          "linear-gradient(160deg, #1A0A24 0%, #2A1338 60%, #3A2050 100%)",
      }}
    >
      {/* Timer flash border */}
      <AnimatePresence>
        {timerFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 z-30"
            style={{ boxShadow: "inset 0 0 0 3px #D4A574" }}
          />
        )}
      </AnimatePresence>

      {showConfetti && <Confetti />}

      {/* ─────────── Top bar ─────────── */}
      <header className="relative z-20 flex items-center justify-between border-b border-creme/8 px-6 py-6 md:px-12 md:py-7">
        <div className="flex items-baseline gap-3 truncate">
          <span className="truncate font-serif text-[1.1rem] italic text-creme md:text-[1.25rem]">
            {recipe.nom}
          </span>
          <span
            className="hidden text-[0.62rem] uppercase tracking-[0.32em] text-creme/55 md:inline"
            aria-hidden
          >
            · {recipe.drapeau} {recipe.origine}
          </span>
        </div>

        <div className="hidden text-[0.62rem] uppercase tracking-[0.32em] text-terracotta md:block">
          Étape {String(currentStep + 1).padStart(2, "0")} sur{" "}
          {String(totalSteps).padStart(2, "0")}
        </div>

        <button
          onClick={quit}
          className="group inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.32em] text-creme/55 transition-colors duration-300 hover:text-creme"
          aria-label="Quitter le mode cuisine"
        >
          <span
            className="inline-block transition-transform duration-300 group-hover:rotate-90"
            aria-hidden
          >
            ×
          </span>
          <span>Quitter</span>
        </button>
      </header>

      {/* Mobile step indicator */}
      <div className="border-b border-creme/8 px-6 py-3 text-center text-[0.6rem] uppercase tracking-[0.32em] text-terracotta md:hidden">
        Étape {String(currentStep + 1).padStart(2, "0")} sur{" "}
        {String(totalSteps).padStart(2, "0")}
      </div>

      {/* ─────────── Center stage ─────────── */}
      <section className="relative flex flex-1 items-center px-6 py-12 md:px-16 md:py-20">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-16">
          {/* Giant number */}
          <div className="md:col-span-5">
            <div className="relative" aria-hidden>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`num-${currentStep}`}
                  initial={{
                    opacity: 0,
                    x: direction === 1 ? -40 : 40,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: direction === 1 ? 40 : -40,
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="select-none font-serif italic leading-[0.85] tracking-[-0.04em] text-gradient-gold-rose"
                  style={{
                    fontSize: "clamp(8rem, 18vw, 16rem)",
                    filter:
                      "drop-shadow(0 0 50px rgba(232, 168, 159, 0.35))",
                  }}
                >
                  {String(currentStep + 1).padStart(2, "0")}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Step text */}
          <div className="md:col-span-7">
            <p className="mb-6 text-[0.62rem] uppercase tracking-[0.32em] text-terracotta">
              — Étape en cours
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={`txt-${currentStep}`}
                initial={{
                  opacity: 0,
                  x: direction === 1 ? 40 : -40,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: direction === 1 ? -40 : 40,
                }}
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="max-w-2xl font-serif italic leading-[1.45] text-creme"
                style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)" }}
              >
                {stepText}
              </motion.p>
            </AnimatePresence>

            {/* Astuce chef on last step */}
            {isLast && recipe.astuce_chef && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-10 max-w-2xl border-l border-terracotta pl-6"
              >
                <p className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-terracotta">
                  — Astuce du chef
                </p>
                <p className="font-sans text-[0.95rem] leading-relaxed text-creme/70">
                  {recipe.astuce_chef}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────── Timer (bottom-left sticky) ─────────── */}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-20 px-6 md:left-12 md:right-auto md:px-0">
        <div
          className="pointer-events-auto inline-flex flex-col gap-3 px-5 py-4 backdrop-blur"
          style={{
            border: "1px solid rgba(232, 168, 159, 0.18)",
            background: "rgba(26, 10, 36, 0.85)",
            boxShadow: "0 12px 30px -12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-baseline justify-between gap-6">
            <p className="text-[0.58rem] uppercase tracking-[0.32em] text-creme/55">
              — Minuteur
            </p>
            {timerSeconds !== null && (
              <button
                onClick={resetTimer}
                className="text-[0.55rem] uppercase tracking-[0.32em] text-creme/45 transition-colors duration-300 hover:text-terracotta"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {timerSeconds === null ? (
            <div className="flex flex-wrap items-center gap-2">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => startTimer(p.minutes)}
                  className="px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.28em] transition-all duration-300"
                  style={{
                    border: "1px solid rgba(248, 242, 234, 0.18)",
                    color: "rgba(248, 242, 234, 0.85)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--or-doux)";
                    e.currentTarget.style.background = "var(--or-doux)";
                    e.currentTarget.style.color = "var(--bg-deep)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(248, 242, 234, 0.18)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(248, 242, 234, 0.85)";
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <span
                className="font-serif italic leading-none tabular-nums"
                style={{
                  fontSize: "clamp(2.2rem, 4vw, 3rem)",
                  color: "var(--or-bright)",
                }}
              >
                {formatCountdown(timerSeconds)}
              </span>
              {timerRunning ? (
                <button
                  onClick={() => setTimerRunning(false)}
                  className="text-[0.58rem] uppercase tracking-[0.28em] text-creme/55 transition-colors duration-300 hover:text-creme"
                >
                  Pause
                </button>
              ) : (
                timerSeconds > 0 && (
                  <button
                    onClick={() => setTimerRunning(true)}
                    className="text-[0.58rem] uppercase tracking-[0.28em] text-creme/55 transition-colors duration-300 hover:text-creme"
                  >
                    Reprendre
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────── Bottom bar ─────────── */}
      <footer
        className="relative z-20"
        style={{
          borderTop: "1px solid rgba(248, 242, 234, 0.08)",
          background: "rgba(26, 10, 36, 0.92)",
        }}
      >
        {/* Progress bar — gradient or-bright */}
        <div className="h-px w-full" style={{ background: "rgba(248, 242, 234, 0.1)" }}>
          <motion.div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, var(--or-doux) 0%, var(--or-bright) 50%, var(--rose-poudre) 100%)",
              boxShadow: "0 0 8px rgba(232, 192, 136, 0.5)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-5 md:px-12 md:py-6">
          <button
            onClick={prev}
            disabled={isFirst}
            className="group inline-flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.32em] text-creme/80 transition-colors duration-300 hover:text-terracotta disabled:cursor-not-allowed disabled:text-creme/20 disabled:hover:text-creme/20"
          >
            <span
              className="inline-block transition-transform duration-300 group-hover:-translate-x-1 group-disabled:translate-x-0"
              aria-hidden
            >
              ←
            </span>
            <span>Précédent</span>
          </button>

          <span className="hidden text-[0.58rem] uppercase tracking-[0.32em] text-creme/30 md:inline">
            ← Précédent · Espace · Suivant →
          </span>

          <button
            onClick={next}
            className="group inline-flex items-center gap-3 px-6 py-3 text-[0.65rem] uppercase tracking-[0.32em] transition-all duration-300"
            style={
              isLast
                ? {
                    border: "1px solid var(--or-doux)",
                    background:
                      "linear-gradient(135deg, var(--or-bright) 0%, var(--or-doux) 100%)",
                    color: "var(--bg-deep)",
                    fontWeight: 600,
                    boxShadow:
                      "0 10px 30px -8px rgba(212, 165, 116, 0.45)",
                  }
                : {
                    border: "1px solid rgba(248, 242, 234, 0.25)",
                    color: "var(--text-primary)",
                    background: "transparent",
                  }
            }
            onMouseEnter={(e) => {
              if (isLast) {
                e.currentTarget.style.transform = "translateY(-2px)";
              } else {
                e.currentTarget.style.borderColor = "var(--rose-poudre)";
                e.currentTarget.style.background =
                  "rgba(232, 168, 159, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (isLast) {
                e.currentTarget.style.transform = "translateY(0)";
              } else {
                e.currentTarget.style.borderColor =
                  "rgba(248, 242, 234, 0.25)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span>{isLast ? "Terminé" : "Suivant"}</span>
            <span
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            >
              {isLast ? "✓" : "→"}
            </span>
          </button>
        </div>
      </footer>
    </main>
  );
}
