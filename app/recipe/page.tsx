"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
  categorie: string;
  temps_total: string;
  ingredients: string[];
  etapes: string[];
  astuce_chef?: string;
  source: string;
  image_url?: string;
  nom_image?: string;
  nutrition: RecipeNutrition;
  indicateur_sante: "vert" | "orange" | "rouge";
  indicateur_label: string;
  anecdote_pays: string;
  fun_fact: string;
  niveau_authenticite: "Traditionnel" | "Adapte" | "Fusion";
  score_compatibilite: number;
  cout_estime_eur: number;
  cout_par_personne_eur: number;
  substitutions?: Record<string, string[]>;
}

const MOCK_RECIPE: Recipe = {
  nom: "Tajine d'agneau aux abricots",
  origine: "Maroc",
  drapeau: "🇲🇦",
  categorie: "Plat principal",
  temps_total: "1h30",
  ingredients: [
    "500g d'agneau (epaule) coupe en cubes",
    "2 oignons jaunes emincés",
    "200g d'abricots secs",
    "2 gousses d'ail ecrasées",
    "1 cuillere a soupe de gingembre frais rapé",
    "1 cuillere a cafe de cannelle moulue",
    "1 cuillere a cafe de cumin",
    "1 pincée de safran",
    "2 cuilleres a soupe de miel",
    "3 cuilleres a soupe d'huile d'olive",
    "1 bouquet de coriandre fraiche",
    "50g d'amandes effilées grillées",
    "Sel, poivre du moulin",
  ],
  etapes: [
    "Faire chauffer l'huile d'olive dans un tajine ou une cocotte en fonte. Y faire revenir l'agneau a feu vif jusqu'a coloration sur toutes les faces, environ 8 minutes.",
    "Ajouter les oignons emincés, l'ail et le gingembre. Laisser fondre doucement 5 minutes en remuant.",
    "Saupoudrer de cannelle, cumin et safran. Saler, poivrer. Bien enrober la viande des épices.",
    "Verser 30cl d'eau chaude, couvrir et laisser mijoter a feu doux pendant 1 heure. Remuer toutes les 15 minutes.",
    "Ajouter les abricots secs et le miel. Poursuivre la cuisson 20 minutes a découvert pour faire réduire la sauce.",
    "Au moment de servir, parsemer d'amandes grillées et de coriandre fraiche ciselée. Accompagner de semoule fine ou de pain marocain.",
  ],
  astuce_chef:
    "Pour un tajine encore plus parfumé, faites tremper les abricots 30 minutes dans de l'eau de fleur d'oranger avant de les incorporer. La sauce gagnera en finesse et en complexité aromatique.",
  source: "Cuisine du monde",
  image_url:
    "https://images.unsplash.com/photo-1547928576-b822bc410bdf?auto=format&fit=crop&w=2400&q=85",
  nom_image: "tagine",
  nutrition: {
    calories_par_personne: 620,
    proteines_g: 42,
    glucides_g: 48,
    lipides_g: 28,
    fibres_g: 6,
  },
  indicateur_sante: "vert",
  indicateur_label: "Équilibré · riche en protéines",
  anecdote_pays:
    "Né dans les Berbères de l'Atlas, le tajine tire son nom du plat de terre cuite conique dans lequel il mijote. La condensation circule sous le chapeau, arrose la viande de ses propres sucs — une cuisson lente qui n'a pas changé depuis mille ans.",
  fun_fact:
    "Au Maroc, on dit qu'un tajine se mange a la main, avec du pain, jamais avec une fourchette. Le pain devient l'ustensile, et chaque convive plonge dans le plat commun — un geste de partage hérité du désert.",
  niveau_authenticite: "Traditionnel",
  score_compatibilite: 92,
  cout_estime_eur: 14.5,
  cout_par_personne_eur: 3.6,
  substitutions: {
    "abricots secs": ["pruneaux dénoyautés", "figues séchées", "dattes Medjool"],
    agneau: ["épaule de mouton", "cuisse de poulet désossée"],
    "amandes effilées": ["pignons de pin", "graines de sésame grillées"],
  },
};

// En prod : URL relative (same-origin Vercel). En dev : pointe sur FastAPI local.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const indicatorColor: Record<Recipe["indicateur_sante"], string> = {
  vert: "#88C26F",
  orange: "#E8B57A",
  rouge: "#D87A6B",
};

const AJR = {
  calories_par_personne: 2000,
  proteines_g: 50,
  glucides_g: 260,
  lipides_g: 70,
  fibres_g: 30,
} as const;

const PERSONNES = 4;

function formatEur(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/,00$/, "")
    + " €";
}

export default function RecipePage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const [openSubs, setOpenSubs] = useState(false);
  const [shareLabel, setShareLabel] = useState("Partager");
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Read recipe from sessionStorage, or seed with MOCK to ease testing.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("currentRecipe");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Recipe;
        setRecipe(parsed);
        return;
      } catch {
        // fall through to mock
      }
    }
    // Dev convenience: seed the mock so the page can render even without /compose.
    window.sessionStorage.setItem("currentRecipe", JSON.stringify(MOCK_RECIPE));
    setRecipe(MOCK_RECIPE);
  }, [router]);

  // Optional async image fetch when image_url is missing.
  useEffect(() => {
    if (!recipe || recipe.image_url) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      plat: recipe.nom,
      origine: recipe.origine,
      nom_image: recipe.nom_image ?? "",
    });
    fetch(`${API_URL}/api/image?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("image fetch failed");
        const data = (await r.json()) as { image_url?: string };
        if (data.image_url) {
          setRecipe((prev) => (prev ? { ...prev, image_url: data.image_url } : prev));
        }
      })
      .catch(() => {
        // ignore — fallback gradient handles it
      });
    return () => controller.abort();
  }, [recipe]);

  // GSAP scroll animations
  useEffect(() => {
    if (!recipe || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Hero title subtle parallax
      gsap.to("[data-hero-title]", {
        y: -60,
        opacity: 0.85,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-section='hero']",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Section reveal
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      // Steps stagger
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el) => {
        const num = el.querySelector("[data-step-num]");
        const body = el.querySelector("[data-step-body]");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });
        if (num)
          tl.fromTo(
            num,
            { x: -60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.9, ease: "power3.out" },
            0,
          );
        if (body)
          tl.fromTo(
            body,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" },
            0.05,
          );
      });
    }, rootRef);

    return () => ctx.revert();
  }, [recipe]);

  const ajrRatios = useMemo(() => {
    if (!recipe) return null;
    const n = recipe.nutrition;
    return {
      calories: Math.min(1, n.calories_par_personne / AJR.calories_par_personne),
      proteines: Math.min(1, n.proteines_g / AJR.proteines_g),
      glucides: Math.min(1, n.glucides_g / AJR.glucides_g),
      lipides: Math.min(1, n.lipides_g / AJR.lipides_g),
      fibres: Math.min(1, n.fibres_g / AJR.fibres_g),
    };
  }, [recipe]);

  if (!recipe) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
      >
        <p className="text-[0.7rem] uppercase tracking-[0.32em]">Chargement…</p>
      </main>
    );
  }

  const hasImage = Boolean(recipe.image_url) && !imageBroken;
  const indicatorDot = indicatorColor[recipe.indicateur_sante];

  const onSaveCarnet = () => {
    try {
      const raw = localStorage.getItem("carnet");
      const list: Recipe[] = raw ? (JSON.parse(raw) as Recipe[]) : [];
      // de-dup by nom
      const exists = list.some((r) => r.nom === recipe.nom);
      const next = exists ? list : [recipe, ...list];
      localStorage.setItem("carnet", JSON.stringify(next));
    } catch {
      // noop
    }
  };

  const onShare = async () => {
    const text = `${recipe.nom} — ${recipe.origine} · ${recipe.temps_total}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.nom, text, url });
        setShareLabel("Partagé");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareLabel("Copié");
      }
      setTimeout(() => setShareLabel("Partager"), 1800);
    } catch {
      setShareLabel("Partager");
    }
  };

  // Score circle stroke
  const SCORE_RADIUS = 56;
  const SCORE_C = 2 * Math.PI * SCORE_RADIUS;
  const scoreOffset = SCORE_C * (1 - recipe.score_compatibilite / 100);

  return (
    <div
      ref={rootRef}
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* ─────────────────────────────────────────────────────────────
         SECTION 1 — HERO MAGAZINE 2 COLONNES ÉDITORIAL
         ────────────────────────────────────────────────────────────── */}
      <section
        data-section="hero"
        className="relative w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-primary) 100%)",
        }}
      >
        {/* top kicker + return button */}
        <div
          className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-8 pt-10 text-[0.62rem] uppercase tracking-[0.32em] md:text-[0.65rem]"
          style={{ color: "var(--rose-poudre)" }}
        >
          <button
            onClick={() => router.push("/compose")}
            className="group inline-flex items-center gap-3 px-4 py-2 font-medium tracking-[0.28em] transition-all duration-300"
            style={{
              border: "1px solid rgba(232, 168, 159, 0.35)",
              color: "var(--text-primary)",
              background: "rgba(58, 32, 80, 0.45)",
              backdropFilter: "blur(8px)",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "var(--or-doux)";
              e.currentTarget.style.color = "var(--bg-deep)";
              e.currentTarget.style.borderColor = "var(--or-doux)";
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(212, 165, 116, 0.4), 0 2px 6px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(58, 32, 80, 0.45)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "rgba(232, 168, 159, 0.35)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              ←
            </span>
            <span>Retour</span>
          </button>
          <span className="hidden font-medium md:inline">
            — {recipe.drapeau} {recipe.origine} · {recipe.categorie}
          </span>
          <button
            onClick={() => router.push("/")}
            className="font-medium tracking-[0.32em] transition-colors duration-300"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--rose-bright)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
          >
            Apollon
          </button>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-8 pb-24 pt-16 md:grid-cols-12 md:gap-16 md:pb-32 md:pt-24">
          {/* Texte gauche */}
          <div className="md:col-span-7">
            <h1
              data-hero-title
              className="font-serif italic leading-[0.92] tracking-[-0.035em] text-gradient-gold-rose"
              style={{
                fontSize: "clamp(3rem, 7.5vw, 7rem)",
                filter:
                  "drop-shadow(0 4px 30px rgba(26, 10, 36, 0.7)) drop-shadow(0 0 60px rgba(232, 168, 159, 0.25))",
              }}
            >
              {recipe.nom}
            </h1>
            <div
              className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.62rem] uppercase tracking-[0.32em] md:text-[0.7rem]"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>{recipe.temps_total}</span>
              <span
                className="inline-block h-[3px] w-[3px] rounded-full"
                style={{ background: "var(--or-doux)" }}
              />
              <span>{PERSONNES} pers.</span>
              <span
                className="inline-block h-[3px] w-[3px] rounded-full"
                style={{ background: "var(--or-doux)" }}
              />
              <span>{recipe.source}</span>
            </div>
          </div>

          {/* Image droite — portrait magazine contained */}
          <div className="md:col-span-5">
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "4 / 5",
                borderRadius: "2px",
                boxShadow:
                  "0 24px 60px rgba(139, 58, 106, 0.45), 0 0 0 1px rgba(232, 168, 159, 0.12)",
              }}
            >
              {hasImage ? (
                <>
                  <img
                    src={recipe.image_url}
                    alt={recipe.nom}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setImageBroken(true)}
                  />
                  {/* subtle aubergine vignette */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(26,10,36,0.0) 60%, rgba(26,10,36,0.35) 100%)",
                    }}
                  />
                </>
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2A1338 0%, #8B3A6A 55%, #D4A574 100%)",
                  }}
                  aria-hidden
                >
                  <span className="select-none text-[10rem] leading-none opacity-60">
                    {recipe.drapeau}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* scroll indicator */}
        <div
          className="relative z-10 mx-auto -mt-8 flex flex-col items-center pb-10 text-center text-[0.58rem] uppercase tracking-[0.4em]"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="mb-3">Faites défiler</div>
          <div
            className="h-10 w-px"
            style={{ background: "rgba(248, 242, 234, 0.35)" }}
          >
            <motion.div
              className="h-3 w-px"
              style={{ background: "var(--or-doux)" }}
              animate={{ y: [0, 28, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 2 — INTRO ANECDOTE + FUN FACT
         ────────────────────────────────────────────────────────────── */}
      <section
        className="px-8 py-32 md:py-40"
        style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
        }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 md:grid-cols-12 md:gap-20">
          <article className="md:col-span-7" data-reveal>
            <p
              className="mb-10 text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — Anecdote du pays
            </p>
            <p
              className="font-serif text-[1.5rem] italic leading-[1.45] md:text-[1.85rem]"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="float-left mr-3 mt-1 font-serif text-[5.5rem] not-italic leading-[0.85] md:text-[7rem]"
                style={{ fontStyle: "italic", color: "var(--or-doux)" }}
              >
                {recipe.anecdote_pays.charAt(0)}
              </span>
              {recipe.anecdote_pays.slice(1)}
            </p>
          </article>

          <aside className="md:col-span-5" data-reveal>
            <div
              className="pl-8"
              style={{ borderLeft: "2px solid var(--or-doux)" }}
            >
              <p
                className="mb-6 text-[0.62rem] uppercase tracking-[0.32em]"
                style={{ color: "var(--text-muted)" }}
              >
                — Le saviez-vous
              </p>
              <p
                className="font-sans text-[1rem] leading-[1.75] md:text-[1.05rem]"
                style={{ color: "var(--text-secondary)" }}
              >
                {recipe.fun_fact}
              </p>

              <div
                className="mt-12 flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.32em]"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: indicatorDot }}
                />
                <span>Niveau · {recipe.niveau_authenticite}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 3 — INGREDIENTS
         ────────────────────────────────────────────────────────────── */}
      <section
        className="px-8 py-32 md:py-40"
        style={{
          background: "var(--bg-deep)",
          borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col gap-6" data-reveal>
            <p
              className="text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — La liste
            </p>
            <h2
              className="font-serif italic leading-[0.95] tracking-[-0.02em] text-gradient-gold-rose"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)" }}
            >
              Ingrédients
            </h2>
            <p
              className="text-[0.7rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--text-muted)" }}
            >
              Pour {PERSONNES} personnes · {recipe.ingredients.length} éléments
            </p>
          </div>

          <ul
            className="grid grid-cols-1 gap-x-16 md:grid-cols-2"
            data-reveal
          >
            {recipe.ingredients.map((ing, idx) => (
              <li
                key={`${ing}-${idx}`}
                className="flex items-baseline gap-6 py-5"
                style={{ borderBottom: "1px solid rgba(232, 168, 159, 0.12)" }}
              >
                <span
                  className="font-serif text-[1.05rem] italic tabular-nums"
                  style={{ color: "var(--or-doux)" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className="font-sans text-[0.98rem] leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ing}
                </span>
              </li>
            ))}
          </ul>

          {recipe.substitutions && Object.keys(recipe.substitutions).length > 0 && (
            <div className="mt-20" data-reveal>
              <button
                onClick={() => setOpenSubs((v) => !v)}
                className="group flex w-full items-center justify-between py-6 text-left transition-colors duration-300"
                style={{
                  borderTop: "1px solid rgba(232, 168, 159, 0.2)",
                }}
                aria-expanded={openSubs}
              >
                <span
                  className="text-[0.7rem] uppercase tracking-[0.32em]"
                  style={{ color: "var(--text-primary)" }}
                >
                  Substitutions possibles · {Object.keys(recipe.substitutions).length}
                </span>
                <span
                  className="font-serif text-[1.4rem] italic transition-transform duration-500"
                  style={{
                    transform: openSubs ? "rotate(45deg)" : "rotate(0deg)",
                    color: "var(--or-doux)",
                  }}
                >
                  +
                </span>
              </button>

              <motion.div
                initial={false}
                animate={{ height: openSubs ? "auto" : 0, opacity: openSubs ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-x-16 gap-y-10 pb-2 pt-10 md:grid-cols-2">
                  {Object.entries(recipe.substitutions).map(([base, alts]) => (
                    <div key={base}>
                      <p
                        className="mb-3 font-serif text-[1.1rem] italic"
                        style={{ color: "var(--rose-poudre)" }}
                      >
                        {base}
                      </p>
                      <ul
                        className="space-y-2 text-[0.92rem]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {alts.map((alt) => (
                          <li
                            key={alt}
                            className="flex items-baseline gap-3 leading-relaxed"
                          >
                            <span
                              className="inline-block h-px w-4 translate-y-[-0.35em]"
                              style={{ background: "var(--or-doux)" }}
                            />
                            <span>{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 4 — PREPARATION
         ────────────────────────────────────────────────────────────── */}
      <section
        className="px-8 py-32 md:py-44"
        style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 flex flex-col gap-6" data-reveal>
            <p
              className="text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — La méthode
            </p>
            <h2
              className="font-serif italic leading-[0.95] tracking-[-0.02em] text-gradient-gold-rose"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)" }}
            >
              Préparation
            </h2>
          </div>

          <ol className="flex flex-col">
            {recipe.etapes.map((etape, idx) => (
              <li
                key={idx}
                data-step
                className="grid grid-cols-12 items-start gap-6 py-14 md:gap-12 md:py-20"
                style={{ borderTop: "1px solid rgba(232, 168, 159, 0.15)" }}
              >
                <div
                  data-step-num
                  className="col-span-3 font-serif italic leading-none tracking-[-0.04em] text-gradient-gold-rose md:col-span-3"
                  style={{
                    fontSize: "clamp(4rem, 8vw, 8rem)",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div
                  data-step-body
                  className="col-span-9 pt-3 md:col-span-9 md:pt-6"
                >
                  <p
                    className="font-sans text-[1.05rem] leading-[1.75] md:text-[1.15rem]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {etape}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 5 — ASTUCE CHEF
         ────────────────────────────────────────────────────────────── */}
      {recipe.astuce_chef && (
        <section
          className="px-8 py-32 md:py-44"
          style={{
            background: "var(--bg-elevated)",
            borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
          }}
        >
          <div className="mx-auto max-w-4xl text-center" data-reveal>
            <span
              className="block font-serif italic leading-none"
              style={{
                fontSize: "clamp(5rem, 10vw, 9rem)",
                color: "var(--or-doux)",
              }}
              aria-hidden
            >
              &ldquo;
            </span>
            <blockquote
              className="mt-2 font-serif italic leading-[1.4]"
              style={{
                fontSize: "clamp(1.4rem, 2.6vw, 1.95rem)",
                color: "var(--text-primary)",
              }}
            >
              {recipe.astuce_chef}
            </blockquote>
            <p
              className="mt-10 text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--or-doux)" }}
            >
              — Astuce du chef
            </p>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
         SECTION 6 — NUTRITION + COUT
         ────────────────────────────────────────────────────────────── */}
      <section
        className="px-8 py-32 md:py-40"
        style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid rgba(232, 168, 159, 0.12)",
        }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-20 md:grid-cols-2 md:gap-28">
          {/* Nutrition */}
          <div
            data-reveal
            className="p-10"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid rgba(232, 168, 159, 0.18)",
              borderRadius: 2,
            }}
          >
            <p
              className="mb-8 text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — Valeurs nutritionnelles
            </p>
            <h3
              className="mb-12 font-serif italic leading-[0.95] tracking-[-0.02em] text-gradient-gold-rose"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Par personne
            </h3>

            <ul className="flex flex-col">
              {([
                ["Calories", `${recipe.nutrition.calories_par_personne} kcal`, ajrRatios?.calories ?? 0],
                ["Protéines", `${recipe.nutrition.proteines_g} g`, ajrRatios?.proteines ?? 0],
                ["Glucides", `${recipe.nutrition.glucides_g} g`, ajrRatios?.glucides ?? 0],
                ["Lipides", `${recipe.nutrition.lipides_g} g`, ajrRatios?.lipides ?? 0],
                ["Fibres", `${recipe.nutrition.fibres_g} g`, ajrRatios?.fibres ?? 0],
              ] as const).map(([label, value, ratio]) => (
                <li
                  key={label}
                  className="py-6"
                  style={{ borderTop: "1px solid rgba(232, 168, 159, 0.15)" }}
                >
                  <div className="flex items-baseline justify-between">
                    <span
                      className="text-[0.65rem] uppercase tracking-[0.32em]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="font-serif text-[1.4rem] italic"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {value}
                    </span>
                  </div>
                  <div
                    className="mt-4 h-px w-full"
                    style={{ background: "rgba(232, 168, 159, 0.15)" }}
                  >
                    <motion.div
                      className="h-px"
                      style={{ background: "var(--or-doux)" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.round(ratio * 100)}%` }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p
                    className="mt-2 text-[0.6rem] uppercase tracking-[0.28em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {Math.round(ratio * 100)}% AJR
                  </p>
                </li>
              ))}
            </ul>

            <div
              className="mt-10 flex items-center gap-3 pt-8 text-[0.65rem] uppercase tracking-[0.32em]"
              style={{
                borderTop: "1px solid rgba(232, 168, 159, 0.18)",
                color: "var(--text-primary)",
              }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: indicatorDot }}
              />
              <span>{recipe.indicateur_label}</span>
            </div>
          </div>

          {/* Coût + compatibilité */}
          <div data-reveal className="flex flex-col gap-12">
            <div
              className="p-10"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid rgba(232, 168, 159, 0.18)",
                borderRadius: 2,
              }}
            >
              <p
                className="mb-8 text-[0.62rem] uppercase tracking-[0.32em]"
                style={{ color: "var(--rose-poudre)" }}
              >
                — Coût estimé
              </p>
              <div
                className="font-serif italic leading-none tracking-[-0.04em] text-gradient-gold-rose"
                style={{ fontSize: "clamp(5rem, 11vw, 9.5rem)" }}
              >
                {formatEur(recipe.cout_estime_eur)}
              </div>
              <p
                className="mt-8 text-[0.68rem] uppercase tracking-[0.32em]"
                style={{ color: "var(--text-muted)" }}
              >
                Coût total · environ {formatEur(recipe.cout_par_personne_eur)} / personne
              </p>
            </div>

            <div
              className="flex items-center gap-10 p-10"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid rgba(232, 168, 159, 0.18)",
                borderRadius: 2,
              }}
            >
              {/* Score circle */}
              <div className="relative h-32 w-32 shrink-0">
                <svg
                  viewBox="0 0 128 128"
                  className="h-full w-full -rotate-90"
                  aria-hidden
                >
                  <circle
                    cx="64"
                    cy="64"
                    r={SCORE_RADIUS}
                    fill="none"
                    stroke="rgba(232, 168, 159, 0.18)"
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r={SCORE_RADIUS}
                    fill="none"
                    stroke="#D4A574"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={SCORE_C}
                    initial={{ strokeDashoffset: SCORE_C }}
                    whileInView={{ strokeDashoffset: scoreOffset }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-serif text-[1.85rem] italic"
                    style={{ color: "var(--or-bright)" }}
                  >
                    {recipe.score_compatibilite}
                  </span>
                </div>
              </div>
              <div>
                <p
                  className="text-[0.62rem] uppercase tracking-[0.32em]"
                  style={{ color: "var(--rose-poudre)" }}
                >
                  — Score de compatibilité
                </p>
                <p
                  className="mt-4 max-w-xs font-serif text-[1.15rem] italic leading-[1.5]"
                  style={{ color: "var(--text-primary)" }}
                >
                  Cette recette correspond à vos ingrédients et préférences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 7 — ACTIONS
         ────────────────────────────────────────────────────────────── */}
      <section
        className="px-8 py-24 md:py-32"
        style={{
          background:
            "linear-gradient(160deg, var(--bg-deep) 0%, var(--bg-primary) 100%)",
          color: "var(--text-primary)",
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-12">
          <div className="flex items-center justify-between" data-reveal>
            <p
              className="text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--rose-poudre)" }}
            >
              — En cuisine
            </p>
            <p
              className="text-[0.62rem] uppercase tracking-[0.32em]"
              style={{ color: "var(--text-muted)" }}
            >
              Fin de la recette
            </p>
          </div>

          <h2
            data-reveal
            className="max-w-3xl font-serif italic leading-[0.95] tracking-[-0.02em] text-gradient-gold-rose"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}
          >
            Prêt à passer au feu ?
          </h2>

          <div
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            data-reveal
          >
            <ActionButton
              label="Mode pas-à-pas"
              onClick={() => router.push("/cuisine")}
              primary
            />
            <ActionButton label="Sauver au carnet" onClick={onSaveCarnet} />
            <ActionButton
              label="Composer une autre"
              onClick={() => router.push("/compose")}
            />
            <ActionButton label={shareLabel} onClick={onShare} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-4 px-7 py-4 text-[0.7rem] font-medium uppercase tracking-[0.25em] transition-all duration-300"
      style={
        primary
          ? {
              border: "1px solid var(--or-doux)",
              background:
                "linear-gradient(135deg, var(--or-bright) 0%, var(--or-doux) 100%)",
              color: "var(--bg-deep)",
              fontWeight: 600,
              boxShadow:
                "0 10px 30px -10px rgba(212, 165, 116, 0.4)",
            }
          : {
              border: "1px solid rgba(248, 242, 234, 0.25)",
              color: "var(--text-primary)",
              background: "transparent",
            }
      }
      onMouseEnter={(e) => {
        if (primary) {
          e.currentTarget.style.transform = "translateY(-2px)";
        } else {
          e.currentTarget.style.borderColor = "var(--rose-poudre)";
          e.currentTarget.style.background = "rgba(232, 168, 159, 0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (primary) {
          e.currentTarget.style.transform = "translateY(0)";
        } else {
          e.currentTarget.style.borderColor = "rgba(248, 242, 234, 0.25)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <span>{label}</span>
      <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </button>
  );
}
