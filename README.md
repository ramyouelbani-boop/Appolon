# Apollon

> Carnet de cuisine éditorial. Compose tes ingrédients, l'IA t'écrit une recette des cuisines du monde et te montre le plat fini.

**Site en ligne : https://apollon.vercel.app**

Projet étudiant développé en duo avec une app sport (le pendant nutrition d'une plateforme bien-être complète).

---

## Aperçu

Splash cinématique d'entrée, puis une planète Terre 3D interactive où chaque pays est un point cliquable qui mène vers sa cuisine. 19 cuisines couvertes (France, Italie, Japon, Inde, Maroc, **Algérie**, Mexique, Liban, etc.).

L'utilisateur coche les ingrédients qu'il a dans son frigo, choisit une région, et l'IA génère :

- Nom du plat + origine + drapeau pays
- Liste des ingrédients (adaptable au nombre de personnes)
- Étapes de préparation détaillées
- Tableau nutritionnel (calories, protéines, glucides, lipides, fibres)
- Indicateur santé (vert / orange / rouge)
- Anecdote culturelle sur le plat
- Score d'authenticité (Traditionnel / Adapté / Fusion)
- Coût estimé en euros
- Substitutions possibles pour chaque ingrédient
- **Vraie photo du plat** (via Spoonacular)
- Mode pas-à-pas avec timer pour cuisiner en suivant les étapes une par une

---

## Stack technique

### Frontend (`/web`)

| Techno | Usage |
|---|---|
| **Next.js 16** App Router | Framework React, SSR + génération statique |
| **TypeScript** strict | Typage complet, zéro `any` |
| **Tailwind CSS v4** | Styling utility-first |
| **Three.js + React Three Fiber + drei** | Planète Terre 3D interactive (shader custom, 19 points pays géolocalisés) |
| **GSAP + ScrollTrigger** | Animations scroll-driven sur la page recette |
| **Framer Motion** | Microinteractions, transitions de page, animations de la bottom bar |
| **Lenis** | Smooth scroll |
| **Cormorant Garamond + Inter** (next/font/google) | Typographie éditoriale |

### Backend (`/web/api`)

Une seule serverless function Vercel (Python 3.12) qui expose une API REST :

| Endpoint | Description |
|---|---|
| `GET /api/health` | Healthcheck |
| `POST /api/recipe` | Génère une recette à partir des ingrédients + cuisine + personnes + régime |
| `GET /api/image` | Renvoie une URL d'image de plat (Spoonacular ou fallback) |

Stack Python :

- **FastAPI** — wrapper REST minimal
- **Anthropic SDK** (`claude-haiku-4-5`) — génération de recettes
- **Requests** — appels Spoonacular + Pollinations + TheMealDB
- **Pydantic** — validation des requêtes

### APIs externes

- **Anthropic Claude API** — moteur de génération de recettes (latence 5-10s, coût ~$0.001/recette)
- **Spoonacular API** — vraies photos de plats (150 req/jour gratuit)
- **Pollinations.ai** — fallback IA si Spoonacular ne trouve pas (illimité gratuit, plus lent)
- **TheMealDB** — base de recettes traditionnelles en fallback (gratuit, sans clé)

### Hébergement

Tout est sur **Vercel** (frontend Next.js + serverless function Python). Pas de base de données — les recettes sont calculées à la volée par Claude, le carnet personnel est stocké en `localStorage` du navigateur.

---

## Structure du projet

```
apollon/
├── web/                        # ← Le projet
│   ├── app/                    # Pages Next.js
│   │   ├── page.tsx            # Splash + Home (planète 3D)
│   │   ├── compose/page.tsx    # Picker d'ingrédients
│   │   ├── recipe/page.tsx     # Affichage recette (layout magazine)
│   │   ├── cuisine/page.tsx    # Mode pas-à-pas avec timer
│   │   ├── carnet/page.tsx     # Bibliothèque des recettes sauvegardées
│   │   ├── layout.tsx          # Layout global + fonts
│   │   └── globals.css         # Palette éditoriale + utilitaires
│   ├── components/
│   │   ├── Planet3D.tsx        # Planète Terre interactive (Three.js)
│   │   └── NebulaSplash.tsx    # Écran d'amorce cinématique
│   ├── api/                    # Serverless functions Python
│   │   ├── index.py            # FastAPI app
│   │   ├── recipe_engine.py    # Moteur Claude + TheMealDB
│   │   └── image_gen.py        # Spoonacular + Pollinations
│   ├── lib/
│   │   └── cuisine-mapping.ts  # Mapping pays → cuisine régionale
│   ├── public/textures/        # Texture Earth landmask, splash background
│   ├── package.json
│   ├── requirements.txt        # Deps Python pour la function serverless
│   └── vercel.json             # Routing + maxDuration
└── README.md
```

---

## Lancer en local

### Prérequis

- Node.js 20+
- Python 3.11+
- Une clé API Anthropic ([console.anthropic.com](https://console.anthropic.com))
- Une clé API Spoonacular ([spoonacular.com/food-api](https://spoonacular.com/food-api))

### Étape 1 — Frontend

```bash
cd web
npm install
cp .env.local.example .env.local
# Édite .env.local et laisse NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Frontend disponible sur **http://localhost:3000**

### Étape 2 — Backend (optionnel pour développer)

```bash
cd web/api
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."
export SPOONACULAR_API_KEY="..."
uvicorn index:app --reload --port 8000
```

Backend sur **http://localhost:8000**.

> En production, le backend tourne en serverless function sur Vercel (pas de serveur persistant). En dev local, on utilise uvicorn pour avoir le hot-reload.

---

## Palette éditoriale "Night gastronomique"

```
Backgrounds      Aubergine #1A0A24  →  #2A1338  →  #3A2050
Accents chauds   Or doux #D4A574    Rose poudré #E8A89F    Magenta #8B3A6A
Texte            Crème #F8F2EA      Gris rose #D4C5B9      Muted #8E7E78
```

Typographie : **Cormorant Garamond** italique pour les titres serif, **Inter** pour le corps.

---

## Captures

- `/` — Splash cinématique, puis planète Terre 3D avec les 19 points pays
- `/compose` — Picker éditorial 5 catégories d'ingrédients colorées
- `/recipe` — Layout magazine 2 colonnes avec photo, gradient or/rose sur le titre
- `/cuisine` — Mode pas-à-pas plein écran charcoal avec timer
- `/carnet` — Bibliothèque des recettes sauvegardées en localStorage

---

## Crédits

- Texture Earth landmask : NASA (domaine public, via three.js examples)
- Photos de plats : Spoonacular API + Pollinations.ai en fallback
- Génération de recettes : Anthropic Claude

Projet réalisé dans le cadre d'un projet étudiant collaboratif (app nutrition × app sport).
