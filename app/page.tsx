"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NebulaSplash from "@/components/NebulaSplash";

const Planet3D = dynamic(() => import("@/components/Planet3D"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  // Si l'utilisateur a deja entre dans la session, skip le splash
  useEffect(() => {
    if (sessionStorage.getItem("nutri:entered") === "1") {
      setShowSplash(false);
    }
  }, []);

  const dismissSplash = () => {
    sessionStorage.setItem("nutri:entered", "1");
    setShowSplash(false);
  };

  if (showSplash) {
    return <NebulaSplash onDismiss={dismissSplash} />;
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #1A0A24 0%, #2A1338 60%, #3A2050 100%)",
        color: "var(--text-primary)",
      }}
    >
      {/* Planete 3D interactive — couvre toute la zone droite */}
      <div className="absolute inset-0 z-0">
        <Planet3D
          onCuisineSelect={(id) => router.push(`/compose?cuisine=${id}`)}
        />
      </div>

      {/* Glow magenta radial discret pour profondeur */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 60%, rgba(139,58,106,0.25) 0%, rgba(139,58,106,0) 60%)",
        }}
      />

      {/* Overlay gradient pour lisibilite du texte cote gauche — aubergine */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/2"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,10,36,0.92) 0%, rgba(42,19,56,0.78) 50%, rgba(42,19,56,0) 100%)",
        }}
      />

      <section className="pointer-events-none relative z-20 mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-8 py-10">
        {/* Header */}
        <header
          className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em]"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Apollon
          </span>
          <span className="font-medium">N°01 — Édition Première · 2026</span>
        </header>

        {/* Bloc editorial gauche */}
        <div className="max-w-xl">
          <p
            className="mb-6 text-[0.65rem] uppercase tracking-[0.32em]"
            style={{ color: "var(--rose-poudre)" }}
          >
            — Une planète de saveurs
          </p>
          <h1
            className="font-serif text-[clamp(3.5rem,8vw,7rem)] italic leading-[0.92] tracking-[-0.04em]"
            style={{ color: "var(--text-primary)" }}
          >
            Compose,
            <br />
            <span
              className="text-gradient-gold-rose"
              style={{
                filter:
                  "drop-shadow(0 0 40px rgba(232, 168, 159, 0.35))",
              }}
            >
              découvre,
            </span>
            <br />
            cuisine.
          </h1>
          <p
            className="mt-10 max-w-md font-sans text-[0.95rem] leading-[1.7]"
            style={{ color: "rgba(248, 242, 234, 0.78)" }}
          >
            Dix-neuf cuisines du monde, accessibles d'un geste. Faites tourner
            la planète, posez le doigt sur un pays — la recette suit.
          </p>

          {/* CTAs sobres editorial */}
          <div className="pointer-events-auto mt-10 flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/compose")}
              className="btn-3d btn-3d-gold group px-7 py-3 text-[0.7rem] font-medium uppercase tracking-[0.25em]"
              style={{
                border: "1px solid rgba(232, 168, 159, 0.4)",
                color: "var(--text-primary)",
                background: "transparent",
              }}
            >
              <span className="inline-flex items-center gap-3">
                Composer une recette
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                router.push("/compose?surprise=1");
              }}
              className="border border-transparent px-4 py-3 text-[0.7rem] font-medium uppercase tracking-[0.25em] transition-colors duration-300"
              style={{ color: "rgba(248, 242, 234, 0.6)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--rose-bright)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(248, 242, 234, 0.6)";
              }}
            >
              ou tirer au sort
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="flex items-end justify-between text-[0.6rem] uppercase tracking-[0.3em]"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="hidden items-center gap-3 sm:flex">
            <span
              className="inline-block h-px w-12"
              style={{ background: "var(--text-muted)" }}
            />
            Faites pivoter — survolez un pays
          </span>
          <span className="hidden sm:inline">Carnet de cuisine</span>
        </footer>
      </section>

      {/* Liste cuisines tap-friendly — MOBILE UNIQUEMENT (Three.js tap pas fiable sur mobile) */}
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 sm:hidden">
        <div
          className="px-4 pt-3 pb-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,10,36,0) 0%, rgba(26,10,36,0.92) 30%, rgba(26,10,36,0.98) 100%)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            className="mb-2 text-center text-[0.6rem] uppercase tracking-[0.32em]"
            style={{ color: "var(--rose-poudre)" }}
          >
            — Choisis une cuisine
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {[
              { id: "france", name: "France", flag: "🇫🇷" },
              { id: "italie", name: "Italie", flag: "🇮🇹" },
              { id: "espagne", name: "Espagne", flag: "🇪🇸" },
              { id: "grece", name: "Grèce", flag: "🇬🇷" },
              { id: "chine", name: "Chine", flag: "🇨🇳" },
              { id: "japon", name: "Japon", flag: "🇯🇵" },
              { id: "thailande", name: "Thaï", flag: "🇹🇭" },
              { id: "vietnam", name: "Vietnam", flag: "🇻🇳" },
              { id: "inde", name: "Inde", flag: "🇮🇳" },
              { id: "coree", name: "Corée", flag: "🇰🇷" },
              { id: "maroc", name: "Maroc", flag: "🇲🇦" },
              { id: "algerie", name: "Algérie", flag: "🇩🇿" },
              { id: "tunisie", name: "Tunisie", flag: "🇹🇳" },
              { id: "turquie", name: "Turquie", flag: "🇹🇷" },
              { id: "liban", name: "Liban", flag: "🇱🇧" },
              { id: "usa", name: "USA", flag: "🇺🇸" },
              { id: "mexique", name: "Mexique", flag: "🇲🇽" },
              { id: "kenya", name: "Kenya", flag: "🇰🇪" },
              { id: "egypte", name: "Égypte", flag: "🇪🇬" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/compose?cuisine=${c.id}`)}
                className="flex shrink-0 items-center gap-2 px-3 py-2 text-[0.75rem]"
                style={{
                  border: "1px solid rgba(232, 168, 159, 0.25)",
                  background: "rgba(58, 32, 80, 0.65)",
                  color: "var(--text-primary)",
                  borderRadius: "2px",
                  minHeight: "44px",
                }}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="whitespace-nowrap font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
