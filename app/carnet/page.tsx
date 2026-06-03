"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

interface RecipeNutrition {
  calories_par_personne: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  fibres_g: number;
}

interface Recipe {
  nom: string;
  origine: string;
  drapeau: string;
  categorie?: string;
  temps_total: string;
  ingredients?: string[];
  etapes: string[];
  astuce_chef?: string;
  source?: string;
  image_url?: string;
  nom_image?: string;
  nutrition?: RecipeNutrition;
  indicateur_sante?: "vert" | "orange" | "rouge";
  indicateur_label?: string;
  anecdote_pays?: string;
  fun_fact?: string;
  niveau_authenticite?: "Traditionnel" | "Adapte" | "Fusion";
  score_compatibilite?: number;
  cout_estime_eur?: number;
  cout_par_personne_eur?: number;
  // tolerance
  [key: string]: unknown;
}

type SortMode = "recent" | "origine" | "temps";

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function formatEur(value: number | undefined): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  return (
    value
      .toFixed(2)
      .replace(".", ",")
      .replace(/,00$/, "") + " €"
  );
}

const PERSONNES = 4;

/**
 * Parse "1h30" / "45 min" / "2 h" into total minutes (best-effort).
 */
function parseTempsMinutes(temps: string | undefined): number {
  if (!temps) return Number.POSITIVE_INFINITY;
  const lower = temps.toLowerCase().replace(/\s+/g, "");
  const hoursMatch = lower.match(/(\d+)\s*h/);
  const minsMatch = lower.match(/(\d+)\s*(?:min|m\b)/);
  let total = 0;
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);
  if (!hoursMatch && !minsMatch) {
    const onlyNum = lower.match(/(\d+)/);
    if (onlyNum) total = parseInt(onlyNum[1], 10);
  }
  return total || Number.POSITIVE_INFINITY;
}

/* ----------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */

export default function CarnetPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [removingNom, setRemovingNom] = useState<string | null>(null);

  /* ---------------------- Load from localStorage --------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("carnet");
      if (!raw) {
        setRecipes([]);
        return;
      }
      const parsed = JSON.parse(raw) as Recipe[];
      setRecipes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecipes([]);
    }
  }, []);

  /* ---------------------- Persist updates ---------------------------- */

  const persist = useCallback((next: Recipe[]) => {
    setRecipes(next);
    try {
      window.localStorage.setItem("carnet", JSON.stringify(next));
    } catch {
      // noop
    }
  }, []);

  /* ---------------------- Sort --------------------------------------- */

  const sorted = useMemo(() => {
    if (!recipes) return [];
    const arr = [...recipes];
    switch (sortMode) {
      case "origine":
        arr.sort((a, b) => a.origine.localeCompare(b.origine, "fr"));
        break;
      case "temps":
        arr.sort(
          (a, b) => parseTempsMinutes(a.temps_total) - parseTempsMinutes(b.temps_total),
        );
        break;
      case "recent":
      default:
        // recipes are prepended on save → already in recent-first order
        break;
    }
    return arr;
  }, [recipes, sortMode]);

  /* ---------------------- Open recipe -------------------------------- */

  const openRecipe = (recipe: Recipe) => {
    try {
      window.sessionStorage.setItem("currentRecipe", JSON.stringify(recipe));
    } catch {
      // noop
    }
    router.push("/recipe");
  };

  /* ---------------------- Remove ------------------------------------- */

  const removeRecipe = (nom: string) => {
    if (!recipes) return;
    setRemovingNom(nom);
    window.setTimeout(() => {
      const next = recipes.filter((r) => r.nom !== nom);
      persist(next);
      setRemovingNom(null);
    }, 350);
  };

  /* ---------------------- Loading state ------------------------------ */

  if (recipes === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-creme text-mute">
        <p className="text-[0.7rem] uppercase tracking-[0.32em]">Chargement…</p>
      </main>
    );
  }

  /* ---------------------- Empty state -------------------------------- */

  if (recipes.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-creme px-8 py-24 text-charcoal">
        <p className="mb-10 text-[0.62rem] uppercase tracking-[0.32em] text-terracotta">
          — Votre cuisine personnelle
        </p>
        <h1
          className="max-w-3xl text-center font-serif italic leading-[1.05] text-gradient-gold-rose-deep"
          style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
        >
          &laquo; Aucune recette dans le carnet pour l&apos;instant. &raquo;
        </h1>
        <p className="mt-10 max-w-md text-center font-sans text-[1rem] leading-relaxed text-warm-gray">
          Composez une première recette pour commencer votre carnet.
        </p>
        <button
          onClick={() => router.push("/compose")}
          className="group mt-14 inline-flex items-center gap-3 border border-charcoal/20 px-7 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-charcoal transition-all duration-300 hover:border-terracotta hover:bg-terracotta hover:text-creme"
        >
          <span>Composer une recette</span>
          <span
            className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          >
            →
          </span>
        </button>
      </main>
    );
  }

  /* ---------------------- Carnet --------------------------------------*/

  return (
    <main className="min-h-screen bg-creme px-6 py-20 text-charcoal md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* ─────────── Header ─────────── */}
        <header className="mb-20 flex flex-col gap-10 md:mb-28 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="flex max-w-3xl flex-col gap-6">
            <p className="text-[0.62rem] uppercase tracking-[0.32em] text-terracotta">
              — Votre cuisine personnelle
            </p>
            <h1
              className="font-serif italic leading-[0.95] tracking-[-0.02em] text-gradient-gold-rose-deep"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              Carnet de recettes
            </h1>
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-mute">
              Vos recettes sauvegardées · {recipes.length}{" "}
              {recipes.length === 1 ? "recette" : "recettes"}
            </p>
          </div>

          <div className="flex items-center gap-4 border-t border-charcoal/10 pt-6 md:border-0 md:pt-0">
            <label
              htmlFor="sort"
              className="text-[0.62rem] uppercase tracking-[0.32em] text-mute"
            >
              Tri ·
            </label>
            <div className="relative">
              <select
                id="sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="cursor-pointer appearance-none border-b border-charcoal/20 bg-transparent py-1 pl-1 pr-7 font-serif text-[1.05rem] italic text-charcoal outline-none transition-colors duration-300 hover:border-terracotta focus:border-terracotta"
              >
                <option value="recent">Plus récente</option>
                <option value="origine">Par origine</option>
                <option value="temps">Par temps</option>
              </select>
              <span
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-serif italic text-terracotta"
                aria-hidden
              >
                ↓
              </span>
            </div>
          </div>
        </header>

        {/* ─────────── Grid ─────────── */}
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.05 },
            },
          }}
          className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-10 md:gap-y-16 lg:grid-cols-3"
        >
          <AnimatePresence>
            {sorted.map((recipe, idx) => {
              const isHover = hoverIdx === idx;
              const isRemoving = removingNom === recipe.nom;
              const cost = formatEur(recipe.cout_estime_eur);

              return (
                <motion.li
                  key={recipe.nom}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`group relative flex cursor-pointer flex-col ${
                    isRemoving ? "pointer-events-none" : ""
                  }`}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => openRecipe(recipe)}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-[4/5] w-full overflow-hidden bg-creme-warm"
                    aria-hidden
                  >
                    {recipe.image_url ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                        style={{ backgroundImage: `url(${recipe.image_url})` }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                        style={{
                          background:
                            "linear-gradient(135deg, #8B3A6A 0%, #1A0A24 60%, #D4A574 100%)",
                        }}
                      >
                        <span className="select-none text-[5rem] leading-none opacity-50">
                          {recipe.drapeau}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(26,10,36,0) 45%, rgba(26,10,36,0.78) 100%)",
                        opacity: isHover ? 1 : 0.55,
                      }}
                    />

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecipe(recipe.nom);
                      }}
                      aria-label={`Retirer ${recipe.nom} du carnet`}
                      className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center border border-creme/40 bg-charcoal/40 text-[0.85rem] text-creme/80 opacity-0 backdrop-blur-sm transition-all duration-300 hover:border-terracotta hover:bg-terracotta hover:text-creme group-hover:opacity-100"
                    >
                      <span aria-hidden>×</span>
                    </button>

                    {/* Voir → */}
                    <div
                      className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.32em] text-creme transition-all duration-500"
                      style={{
                        opacity: isHover ? 1 : 0,
                        transform: isHover
                          ? "translateY(0)"
                          : "translateY(8px)",
                      }}
                    >
                      <span>Voir la recette</span>
                      <span
                        className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden
                      >
                        →
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="mt-6 flex flex-col gap-3">
                    <p className="text-[0.6rem] uppercase tracking-[0.32em] text-terracotta">
                      <span aria-hidden>{recipe.drapeau}</span>{" "}
                      <span>{recipe.origine}</span>
                      {recipe.categorie && (
                        <>
                          {" "}
                          <span className="text-mute/70">
                            · {recipe.categorie}
                          </span>
                        </>
                      )}
                    </p>
                    <h2
                      className="font-serif italic leading-[1.05] tracking-[-0.015em] text-charcoal transition-colors duration-300 group-hover:text-terracotta"
                      style={{ fontSize: "clamp(1.5rem, 2.2vw, 2.2rem)" }}
                    >
                      {recipe.nom}
                    </h2>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] uppercase tracking-[0.28em] text-warm-gray">
                      <span>{recipe.temps_total}</span>
                      <span
                        className="inline-block h-[3px] w-[3px] rounded-full bg-mute/60"
                        aria-hidden
                      />
                      <span>{PERSONNES} pers.</span>
                      {cost && (
                        <>
                          <span
                            className="inline-block h-[3px] w-[3px] rounded-full bg-mute/60"
                            aria-hidden
                          />
                          <span>{cost}</span>
                        </>
                      )}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>

        {/* ─────────── Bottom CTA ─────────── */}
        <div className="mt-28 flex justify-center border-t border-charcoal/10 pt-16 md:mt-36 md:pt-20">
          <button
            onClick={() => router.push("/compose")}
            className="group inline-flex items-center gap-3 border border-charcoal/20 px-8 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-charcoal transition-all duration-300 hover:border-terracotta hover:bg-terracotta hover:text-creme"
          >
            <span>Composer une nouvelle recette</span>
            <span
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            >
              →
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
