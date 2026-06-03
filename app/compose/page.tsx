"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  countryIdToCuisine,
  CUISINE_OPTIONS,
  type CuisineLabel,
} from "@/lib/cuisine-mapping";

/* ----------------------------------------------------------------------------
 * Données
 * -------------------------------------------------------------------------- */

const ALIMENTS = {
  "Protéines": [
    "Poulet",
    "Bœuf",
    "Agneau",
    "Porc",
    "Poisson",
    "Saumon",
    "Thon",
    "Crevettes",
    "Œuf",
    "Tofu",
    "Lentilles",
    "Pois chiches",
    "Haricots rouges",
  ],
  "Légumes": [
    "Tomate",
    "Oignon",
    "Ail",
    "Carotte",
    "Courgette",
    "Poivron",
    "Aubergine",
    "Épinards",
    "Salade",
    "Brocoli",
    "Champignon",
    "Concombre",
    "Pomme de terre",
  ],
  "Féculents": [
    "Riz",
    "Pâtes",
    "Semoule",
    "Quinoa",
    "Boulgour",
    "Pain",
    "Couscous",
  ],
  "Herbes & Épices": [
    "Basilic",
    "Persil",
    "Coriandre",
    "Menthe",
    "Curry",
    "Curcuma",
    "Cumin",
    "Paprika",
    "Gingembre",
    "Cannelle",
    "Safran",
    "Ras el hanout",
  ],
  "Produits laitiers": ["Lait", "Yaourt", "Fromage", "Beurre", "Crème"],
} as const;

type Category = keyof typeof ALIMENTS;
const CATEGORIES = Object.keys(ALIMENTS) as Category[];

// Emoji par ingrédient (affichage uniquement, la valeur stockée reste le nom propre)
const EMOJIS: Record<string, string> = {
  Poulet: "🍗", Bœuf: "🥩", Agneau: "🐑", Porc: "🥓",
  Poisson: "🐟", Saumon: "🍣", Thon: "🐠", Crevettes: "🍤",
  Œuf: "🥚", Tofu: "🧈", Lentilles: "🫘", "Pois chiches": "🫛",
  "Haricots rouges": "🫘",
  Tomate: "🍅", Oignon: "🧅", Ail: "🧄", Carotte: "🥕",
  Courgette: "🥒", Poivron: "🫑", Aubergine: "🍆", Épinards: "🥬",
  Salade: "🥗", Brocoli: "🥦", Champignon: "🍄", Concombre: "🥒",
  "Pomme de terre": "🥔",
  Riz: "🍚", Pâtes: "🍝", Semoule: "🌾", Quinoa: "🌾",
  Boulgour: "🌾", Pain: "🥖", Couscous: "🍲",
  Basilic: "🌿", Persil: "🌿", Coriandre: "🌿", Menthe: "🍃",
  Curry: "🌶️", Curcuma: "🟡", Cumin: "🟤", Paprika: "🔴",
  Gingembre: "🫚", Cannelle: "🌰", Safran: "🌸", "Ras el hanout": "✨",
  Lait: "🥛", Yaourt: "🍶", Fromage: "🧀", Beurre: "🧈", Crème: "🍦",
};

// Accent couleur par categorie — palette night gastronomique
const CATEGORY_ACCENT: Record<Category, { color: string; soft: string }> = {
  "Protéines":         { color: "var(--coral)",       soft: "rgba(216,130,107,0.4)" },
  "Légumes":           { color: "var(--success)",     soft: "rgba(136,194,111,0.4)" },
  "Féculents":         { color: "var(--or-doux)",     soft: "rgba(212,165,116,0.4)" },
  "Herbes & Épices":   { color: "var(--rose-poudre)", soft: "rgba(232,168,159,0.4)" },
  "Produits laitiers": { color: "var(--or-bright)",   soft: "rgba(232,192,136,0.4)" },
};

const REGIMES = [
  "Aucun",
  "Végétarien",
  "Halal",
  "Sans gluten",
  "Sans lactose",
] as const;
type Regime = (typeof REGIMES)[number];

/* ----------------------------------------------------------------------------
 * Selectbox custom (editorial)
 * -------------------------------------------------------------------------- */

type EditorialSelectProps<T extends string> = {
  label: string;
  value: T;
  options: ReadonlyArray<T>;
  onChange: (v: T) => void;
  disabled?: boolean;
};

function EditorialSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: EditorialSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <span
        className="block text-[0.6rem] font-medium uppercase tracking-[0.28em]"
        style={{ color: "var(--rose-poudre)" }}
      >
        {label}
      </span>
      <div
        className="mt-2 pb-2"
        style={{ borderBottom: "1px solid rgba(232, 168, 159, 0.35)" }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left font-serif text-2xl italic transition-colors disabled:opacity-40"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.color = "var(--or-bright)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          <span>{value}</span>
          <span
            className={`text-xs transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
            style={{ color: "var(--text-secondary)" }}
            aria-hidden
          >
            ▾
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.25, 0, 0, 1] }}
            className="absolute left-0 right-0 top-full z-40 mt-2 py-2"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid rgba(232, 168, 159, 0.18)",
              boxShadow:
                "0 24px 60px -20px rgba(0,0,0,0.6), 0 0 40px -20px rgba(139,58,106,0.3)",
            }}
          >
            {options.map((opt) => {
              const active = opt === value;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2 font-serif text-base italic transition-colors"
                    style={{
                      color: active
                        ? "var(--or-bright)"
                        : "var(--text-primary)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--bg-surface)";
                        e.currentTarget.style.color = "var(--rose-bright)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                  >
                    <span>{opt}</span>
                    {active && (
                      <span className="text-[0.6rem] uppercase tracking-[0.28em]">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Stepper Personnes
 * -------------------------------------------------------------------------- */

function PersonStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(12, value + 1));
  return (
    <div>
      <span
        className="block text-[0.6rem] font-medium uppercase tracking-[0.28em]"
        style={{ color: "var(--rose-poudre)" }}
      >
        Personnes
      </span>
      <div
        className="mt-2 flex items-center justify-between pb-2"
        style={{ borderBottom: "1px solid rgba(232, 168, 159, 0.35)" }}
      >
        <button
          type="button"
          onClick={dec}
          disabled={disabled || value <= 1}
          aria-label="Diminuer le nombre de personnes"
          className="flex h-9 w-9 items-center justify-center text-base transition-all disabled:opacity-30"
          style={{
            border: "1px solid rgba(248, 242, 234, 0.18)",
            color: "var(--text-primary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            if (!(disabled || value <= 1)) {
              e.currentTarget.style.borderColor = "var(--or-doux)";
              e.currentTarget.style.color = "var(--or-bright)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(248, 242, 234, 0.18)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          −
        </button>
        <span
          className="font-serif text-3xl italic tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={disabled || value >= 12}
          aria-label="Augmenter le nombre de personnes"
          className="flex h-9 w-9 items-center justify-center text-base transition-all disabled:opacity-30"
          style={{
            border: "1px solid rgba(248, 242, 234, 0.18)",
            color: "var(--text-primary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            if (!(disabled || value >= 12)) {
              e.currentTarget.style.borderColor = "var(--or-doux)";
              e.currentTarget.style.color = "var(--or-bright)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(248, 242, 234, 0.18)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Toggle pill ingrédient
 * -------------------------------------------------------------------------- */

function IngredientPill({
  label,
  selected,
  onToggle,
  disabled,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accentColor?: string;
}) {
  const emoji = EMOJIS[label] ?? "";
  const color = accentColor ?? "var(--or-doux)";
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = "var(--bg-surface)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "rgba(232, 168, 159, 0.15)";
          e.currentTarget.style.background = "var(--bg-elevated)";
        }
      }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="group relative w-full overflow-hidden px-4 py-2.5 text-left text-[0.875rem] transition-all duration-200 ease-out disabled:opacity-50 hover:-translate-y-px"
      style={
        selected
          ? {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: color,
              background: color,
              color: "var(--bg-deep)",
              boxShadow: `0 0 0 1px ${color}, 0 8px 24px -16px ${color}`,
              fontWeight: 500,
            }
          : {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(232, 168, 159, 0.15)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }
      }
    >
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {emoji && <span className="text-base leading-none">{emoji}</span>}
        <span>{label}</span>
      </span>
      {selected && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] tracking-[0.2em]"
          style={{ color: "var(--bg-deep)" }}
          aria-hidden
        >
          ●
        </span>
      )}
    </motion.button>
  );
}

/* ----------------------------------------------------------------------------
 * Équilibre nutritionnel (vert / orange / rouge)
 * -------------------------------------------------------------------------- */

function computeBalance(selected: Set<string>): {
  status: "ok" | "warn" | "bad";
  label: string;
} {
  const hasProtein = ALIMENTS["Protéines"].some((p) => selected.has(p));
  const hasVeg = ALIMENTS["Légumes"].some((p) => selected.has(p));
  const hasStarch = ALIMENTS["Féculents"].some((p) => selected.has(p));
  const score =
    (hasProtein ? 1 : 0) + (hasVeg ? 1 : 0) + (hasStarch ? 1 : 0);
  if (score === 3) return { status: "ok", label: "Équilibre complet" };
  if (score === 2) return { status: "warn", label: "Équilibre presque là" };
  return { status: "bad", label: "Manque d'équilibre" };
}

/* ----------------------------------------------------------------------------
 * Compose Inner (utilise useSearchParams → wrap dans Suspense)
 * -------------------------------------------------------------------------- */

type ApiResponse = {
  recipe?: unknown;
  [key: string]: unknown;
};

function ComposeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCuisineId = searchParams.get("cuisine");
  const surpriseFlag = searchParams.get("surprise") === "1";

  const [cuisine, setCuisine] = useState<CuisineLabel>(() =>
    countryIdToCuisine(initialCuisineId),
  );
  const [personnes, setPersonnes] = useState<number>(2);
  const [regime, setRegime] = useState<Regime>("Aucun");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surpriseRan = useRef(false);

  const allIngredients = useMemo(
    () => CATEGORIES.flatMap((c) => ALIMENTS[c]),
    [],
  );

  const drawRandom = useCallback(() => {
    const count = 4 + Math.floor(Math.random() * 4); // 4–7
    const shuffled = [...allIngredients].sort(() => Math.random() - 0.5);
    setSelected(new Set(shuffled.slice(0, count)));
  }, [allIngredients]);

  // Auto-déclenchement si ?surprise=1
  useEffect(() => {
    if (surpriseFlag && !surpriseRan.current) {
      surpriseRan.current = true;
      drawRandom();
      if (!initialCuisineId) {
        const realCuisines = CUISINE_OPTIONS.filter(
          (c) => c !== "Surprends-moi",
        );
        setCuisine(
          realCuisines[
            Math.floor(Math.random() * realCuisines.length)
          ] as CuisineLabel,
        );
      }
    }
  }, [surpriseFlag, drawRandom, initialCuisineId]);

  const toggle = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const balance = useMemo(() => computeBalance(selected), [selected]);

  const submit = async () => {
    if (selectedList.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // En prod : URL relative (same-origin, rewrite Vercel vers fn Python).
      // En dev : NEXT_PUBLIC_API_URL pointe sur FastAPI local 8000.
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedList,
          cuisine,
          personnes,
          regime,
        }),
      });
      if (!res.ok) {
        throw new Error(`Erreur API ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      sessionStorage.setItem("currentRecipe", JSON.stringify(data));
      router.push("/recipe");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Impossible de générer la recette";
      setError(msg);
      setSubmitting(false);
    }
  };

  const balanceColor =
    balance.status === "ok"
      ? "var(--success)"
      : balance.status === "warn"
        ? "var(--warning)"
        : "var(--danger)";

  return (
    <main
      className="relative min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #1A0A24 0%, #2A1338 100%)",
        color: "var(--text-primary)",
      }}
    >
      {/* Glow magenta radial discret */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 0%, rgba(139,58,106,0.22) 0%, rgba(139,58,106,0) 70%)",
        }}
      />

      {/* Section 1 — Header de page */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 sm:px-10 lg:pt-24">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p
              className="text-[0.65rem] font-medium uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — Étape 1
            </p>
            <h1
              className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] italic leading-[0.95] tracking-[-0.03em]"
            >
              <span style={{ color: "var(--text-primary)" }}>Composez </span>
              <span className="text-gradient-gold-rose">votre carte</span>
            </h1>
            <p
              className="mt-8 max-w-2xl font-serif text-[clamp(1.05rem,1.4vw,1.35rem)] italic leading-[1.55]"
              style={{ color: "var(--text-secondary)" }}
            >
              Sélectionnez les ingrédients à votre disposition. La cuisine du
              monde s'invitera ensuite à votre table.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="hidden shrink-0 self-start px-5 py-2.5 text-[0.6rem] font-medium uppercase tracking-[0.28em] transition-all sm:inline-flex"
            style={{
              border: "1px solid rgba(232, 168, 159, 0.3)",
              color: "var(--text-primary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--or-doux)";
              e.currentTarget.style.color = "var(--or-bright)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                "rgba(232, 168, 159, 0.3)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            ← Retour
          </button>
        </div>
      </section>

      {/* Section 2 — Préférences (bandeau sticky) */}
      <section
        className="sticky top-0 z-30 mt-16 backdrop-blur-md"
        style={{
          background: "rgba(26, 10, 36, 0.92)",
          borderTop: "1px solid rgba(232, 168, 159, 0.12)",
          borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10">
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <EditorialSelect<CuisineLabel>
              label="Cuisine"
              value={cuisine}
              options={CUISINE_OPTIONS}
              onChange={setCuisine}
              disabled={submitting}
            />
            <PersonStepper
              value={personnes}
              onChange={setPersonnes}
              disabled={submitting}
            />
            <EditorialSelect<Regime>
              label="Régime"
              value={regime}
              options={REGIMES}
              onChange={setRegime}
              disabled={submitting}
            />
            <div>
              <span
                className="block text-[0.6rem] font-medium uppercase tracking-[0.28em]"
                style={{ color: "var(--rose-poudre)" }}
              >
                Inspiration
              </span>
              <div
                className="mt-2 pb-2"
                style={{ borderBottom: "1px solid rgba(232, 168, 159, 0.35)" }}
              >
                <button
                  type="button"
                  onClick={drawRandom}
                  disabled={submitting}
                  className="group flex w-full items-center justify-between font-serif text-2xl italic transition-colors disabled:opacity-40"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    if (!submitting)
                      e.currentTarget.style.color = "var(--or-bright)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                >
                  <span>Tirer au sort</span>
                  <span
                    className="text-[0.6rem] uppercase tracking-[0.28em] transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Picker d'ingrédients */}
      <section className="relative z-10 mx-auto max-w-7xl pb-48 pt-16 sm:px-10 sm:pt-20">
        {/* Indicateur catégories mobile — bullets en haut */}
        <div className="mb-6 flex items-center justify-center gap-2 px-6 sm:hidden">
          {CATEGORIES.map((cat) => {
            const accent = CATEGORY_ACCENT[cat];
            return (
              <span
                key={cat}
                className="inline-block h-1 w-8 rounded-full"
                style={{ background: accent.color, opacity: 0.5 }}
              />
            );
          })}
        </div>
        <p
          className="mb-4 text-center text-[0.6rem] uppercase tracking-[0.32em] sm:hidden"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Faites glisser entre catégories →
        </p>

        {/* Container : grille desktop / swiper horizontal mobile */}
        <div
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-5"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => {
            const accent = CATEGORY_ACCENT[cat];
            return (
              <div
                key={cat}
                className="w-[85vw] shrink-0 snap-center sm:w-auto sm:shrink"
              >
                <div className="mb-6">
                  <h2
                    className="font-serif text-2xl italic"
                    style={{ color: accent.color }}
                  >
                    {cat}
                  </h2>
                  <span
                    className="mt-2 block h-px w-10"
                    style={{ background: accent.soft }}
                  />
                </div>
                <ul className="space-y-2.5">
                  {ALIMENTS[cat].map((item) => (
                    <li key={item}>
                      <IngredientPill
                        label={item}
                        selected={selected.has(item)}
                        onToggle={() => toggle(item)}
                        disabled={submitting}
                        accentColor={accent.color}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note éditorial */}
        <p
          className="mt-24 max-w-xl font-serif text-base italic"
          style={{ color: "var(--text-muted)" }}
        >
          — Cochez ce que vous avez dans le frigo. Les manques sont rarement
          des obstacles, plus souvent des prétextes à l'invention.
        </p>
      </section>

      {/* Section 4 — Bottom bar fixed */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0, 0, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 backdrop-blur-md"
            style={{
              background: "rgba(26, 10, 36, 0.95)",
              borderTop: "1px solid rgba(232, 168, 159, 0.18)",
              boxShadow:
                "0 -20px 60px -20px rgba(139,58,106,0.35)",
            }}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:px-10 lg:flex-row lg:items-center lg:gap-8">
              {/* Compteur + équilibre */}
              <div className="flex items-center gap-4 lg:shrink-0">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: balanceColor,
                    boxShadow: `0 0 12px ${balanceColor}`,
                  }}
                />
                <div>
                  <p
                    className="font-serif text-xl italic"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selected.size} ingrédient{selected.size > 1 ? "s" : ""}{" "}
                    sélectionné{selected.size > 1 ? "s" : ""}
                  </p>
                  <p
                    className="text-[0.65rem] uppercase tracking-[0.28em]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {balance.label}
                  </p>
                </div>
              </div>

              {/* Pills horizontalement scrollables — cachees sur mobile */}
              <div className="hidden min-w-0 flex-1 overflow-x-auto lg:block">
                <ul className="flex items-center gap-2 whitespace-nowrap">
                  {selectedList.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 px-3 py-1.5 text-[0.75rem]"
                      style={{
                        border: "1px solid rgba(232, 168, 159, 0.25)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        aria-label={`Retirer ${item}`}
                        className="transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--rose-bright)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            "var(--text-secondary)";
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA — bouton or brillant */}
              <button
                type="button"
                onClick={submit}
                disabled={submitting || selected.size === 0}
                className="group relative inline-flex shrink-0 items-center justify-center gap-3 px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.28em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, var(--or-bright) 0%, var(--or-doux) 100%)",
                  color: "var(--bg-deep)",
                  boxShadow:
                    "0 12px 30px -10px rgba(212, 165, 116, 0.5), 0 0 0 1px rgba(232, 192, 136, 0.4)",
                }}
                onMouseEnter={(e) => {
                  if (!(submitting || selected.size === 0)) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 18px 40px -10px rgba(232, 168, 159, 0.6), 0 0 0 1px rgba(232, 192, 136, 0.6)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px -10px rgba(212, 165, 116, 0.5), 0 0 0 1px rgba(232, 192, 136, 0.4)";
                }}
              >
                {submitting ? (
                  <>
                    <span
                      aria-hidden
                      className="h-3 w-3 animate-spin rounded-full"
                      style={{
                        border: "1px solid rgba(26, 10, 36, 0.3)",
                        borderTopColor: "var(--bg-deep)",
                      }}
                    />
                    <span className="font-serif text-sm italic normal-case tracking-normal">
                      Composition en cours…
                    </span>
                  </>
                ) : (
                  <>
                    <span>Générer la recette</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Toast erreur */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto max-w-7xl px-6 py-3 font-serif text-sm italic sm:px-10"
                  style={{
                    borderTop: "1px solid rgba(216, 122, 107, 0.4)",
                    background: "rgba(216, 122, 107, 0.08)",
                    color: "var(--danger)",
                  }}
                  role="status"
                >
                  — {error}. La table attendra.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ----------------------------------------------------------------------------
 * Page (wrap Suspense pour useSearchParams en Next.js 16)
 * -------------------------------------------------------------------------- */

function ComposeFallback() {
  return (
    <main
      className="min-h-screen px-8 py-24"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <p
        className="text-[0.65rem] font-medium uppercase tracking-[0.32em]"
        style={{ color: "var(--rose-poudre)" }}
      >
        — Étape 1
      </p>
      <h1 className="mt-6 font-serif text-6xl italic text-gradient-gold-rose">
        Composez votre carte
      </h1>
    </main>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<ComposeFallback />}>
      <ComposeInner />
    </Suspense>
  );
}
