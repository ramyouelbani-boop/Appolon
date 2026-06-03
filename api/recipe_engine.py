"""
Moteur de recettes : cherche d'abord dans TheMealDB (vraies recettes),
puis bascule sur Claude IA pour generer une recette enrichie avec
tableau nutritionnel, anecdote pays, niveau d'authenticite, score compatibilite.
"""

import os
import json
import unicodedata
import requests
from anthropic import Anthropic

# Note : pas de dotenv en serverless Vercel (env vars injectees directement).
# En dev local FastAPI, exporter ANTHROPIC_API_KEY dans le shell avant d'uvicorn.

MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1"
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# Mapping styles de cuisine -> "areas" de TheMealDB
CUISINE_AREAS = {
    "Europeenne": ["French", "Italian", "British", "Spanish", "Greek", "Portuguese", "Dutch", "Irish", "Polish"],
    "Asiatique": ["Chinese", "Japanese", "Thai", "Vietnamese", "Malaysian", "Filipino", "Indian"],
    "Orientale": ["Moroccan", "Tunisian", "Turkish", "Egyptian"],
    "Africaine": ["Kenyan", "Moroccan", "Tunisian", "Egyptian"],
    "Americaine": ["American", "Mexican", "Jamaican", "Canadian"],
    "Surprends-moi": [],  # tous
}

# Emoji drapeau par pays/region pour l'immersion
DRAPEAUX = {
    "France": "🇫🇷", "Italian": "🇮🇹", "Italy": "🇮🇹", "Italie": "🇮🇹",
    "Spain": "🇪🇸", "Espagne": "🇪🇸", "British": "🇬🇧", "Royaume-Uni": "🇬🇧",
    "Greek": "🇬🇷", "Grece": "🇬🇷", "Portuguese": "🇵🇹", "Portugal": "🇵🇹",
    "Chinese": "🇨🇳", "Chine": "🇨🇳", "Japanese": "🇯🇵", "Japon": "🇯🇵",
    "Thai": "🇹🇭", "Thailande": "🇹🇭", "Vietnamese": "🇻🇳", "Vietnam": "🇻🇳",
    "Indian": "🇮🇳", "Inde": "🇮🇳", "Korean": "🇰🇷", "Coree": "🇰🇷",
    "Moroccan": "🇲🇦", "Maroc": "🇲🇦", "Algerian": "🇩🇿", "Algerie": "🇩🇿",
    "Algeria": "🇩🇿", "Algérie": "🇩🇿", "Tunisian": "🇹🇳", "Tunisie": "🇹🇳",
    "Turkish": "🇹🇷", "Turquie": "🇹🇷", "Egyptian": "🇪🇬", "Egypte": "🇪🇬",
    "Lebanese": "🇱🇧", "Liban": "🇱🇧", "American": "🇺🇸", "USA": "🇺🇸",
    "Mexican": "🇲🇽", "Mexique": "🇲🇽", "Jamaican": "🇯🇲", "Jamaique": "🇯🇲",
    "Kenyan": "🇰🇪", "Kenya": "🇰🇪", "Malaysian": "🇲🇾", "Malaisie": "🇲🇾",
    "Filipino": "🇵🇭", "Philippines": "🇵🇭", "Iranian": "🇮🇷", "Iran": "🇮🇷",
}


def _strip_accents(s: str) -> str:
    """Retire les accents d'une chaine pour matching tolerant."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def get_drapeau(origine: str) -> str:
    """Trouve l'emoji drapeau correspondant a l'origine (matching tolerant, sans accents)."""
    if not origine:
        return "🌍"
    origine_norm = _strip_accents(origine).lower()
    for key, flag in DRAPEAUX.items():
        if _strip_accents(key).lower() in origine_norm:
            return flag
    return "🌍"


def _claude_client():
    """Cree un client Anthropic si la cle API est presente."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "ta_cle_ici":
        return None
    return Anthropic(api_key=api_key)


def search_themealdb(ingredients: list[str], cuisine: str) -> dict | None:
    """Cherche une recette dans TheMealDB qui matche les ingredients et le style."""
    if not ingredients:
        return None
    main_ingredient = ingredients[0].lower().replace(" ", "_")
    try:
        resp = requests.get(f"{MEALDB_BASE}/filter.php", params={"i": main_ingredient}, timeout=10)
        resp.raise_for_status()
        meals = resp.json().get("meals") or []
    except (requests.RequestException, ValueError):
        return None

    if not meals:
        return None

    target_areas = CUISINE_AREAS.get(cuisine, [])
    for meal in meals[:10]:
        try:
            detail = requests.get(f"{MEALDB_BASE}/lookup.php", params={"i": meal["idMeal"]}, timeout=10)
            detail.raise_for_status()
            data = detail.json().get("meals", [])
            if not data:
                continue
            full = data[0]
            if target_areas and full.get("strArea") not in target_areas:
                continue
            return _normalize_mealdb(full)
        except (requests.RequestException, ValueError):
            continue

    if cuisine == "Surprends-moi" and meals:
        try:
            detail = requests.get(f"{MEALDB_BASE}/lookup.php", params={"i": meals[0]["idMeal"]}, timeout=10)
            detail.raise_for_status()
            data = detail.json().get("meals", [])
            if data:
                return _normalize_mealdb(data[0])
        except (requests.RequestException, ValueError):
            pass

    return None


def _normalize_mealdb(meal: dict) -> dict:
    """Transforme la reponse TheMealDB en format unifie + enrichi par Claude (nutrition + anecdote)."""
    ingredients = []
    for i in range(1, 21):
        ing = meal.get(f"strIngredient{i}", "").strip()
        mes = meal.get(f"strMeasure{i}", "").strip()
        if ing:
            ingredients.append(f"{mes} {ing}".strip())

    steps_raw = meal.get("strInstructions", "")
    steps = [s.strip() for s in steps_raw.replace("\r\n", "\n").split("\n") if s.strip()]
    origine = meal.get("strArea", "Inconnue")

    recipe = {
        "nom": meal.get("strMeal", "Recette"),
        "origine": origine,
        "drapeau": get_drapeau(origine),
        "categorie": meal.get("strCategory", ""),
        "ingredients": ingredients,
        "etapes": steps,
        "source": "Cuisine du monde",
        "temps_total": "30-45 min",
        "image_url": meal.get("strMealThumb"),
    }

    # Enrichir avec Claude (nutrition + anecdote + authenticite)
    enrichment = enrich_with_claude(recipe)
    if enrichment:
        recipe.update(enrichment)

    return recipe


def enrich_with_claude(recipe: dict) -> dict | None:
    """Demande a Claude d'enrichir une recette existante avec nutrition + anecdote + auth."""
    client = _claude_client()
    if not client:
        return None

    prompt = f"""Tu es un expert nutritionniste et historien culinaire. Pour cette recette :
Nom : {recipe['nom']}
Origine : {recipe['origine']}
Ingredients : {", ".join(recipe['ingredients'][:10])}

Genere les infos enrichies suivantes en JSON valide uniquement (aucun markdown, aucun texte autour) :

{{
  "nutrition": {{
    "calories_par_personne": 450,
    "proteines_g": 25,
    "glucides_g": 50,
    "lipides_g": 15,
    "fibres_g": 5
  }},
  "indicateur_sante": "vert",
  "indicateur_label": "Plat equilibre",
  "anecdote_pays": "2-3 phrases sur l'origine culturelle du plat, son histoire ou son contexte",
  "fun_fact": "1 fait amusant et court (max 20 mots)",
  "niveau_authenticite": "Traditionnel",
  "score_compatibilite": 85,
  "astuce_chef": "Une astuce courte pour reussir le plat",
  "substitutions": {{"ingredient_original": ["substitut 1", "substitut 2"]}},
  "cout_estime_eur": 12.50,
  "cout_par_personne_eur": 3.10,
  "nom_image": "tagine"
}}

Regles :
- indicateur_sante : "vert" = equilibre/leger, "orange" = correct mais riche, "rouge" = tres riche
- niveau_authenticite : "Traditionnel", "Adapte", ou "Fusion"
- substitutions : 3-4 ingredients principaux avec 1-2 alternatives
- cout_estime_eur : estimation realiste prix supermarche France 2026
- nom_image : UN ou DEUX mots en ANGLAIS qui identifient le type de plat (ex: "biryani", "tagine", "pad thai", "carbonara", "ramen", "couscous", "paella", "sushi"). Sert pour chercher une vraie photo de plat."""

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        return json.loads(text)
    except (json.JSONDecodeError, Exception):
        return None


def generate_with_claude(ingredients: list[str], cuisine: str, personnes: int, regime: str) -> dict | None:
    """Genere une recette COMPLETE via Claude IA (avec nutrition + anecdote + auth + compat)."""
    client = _claude_client()
    if not client:
        return None

    regime_text = "" if regime == "Aucun" else f"Le regime alimentaire est : {regime}. "

    prompt = f"""Tu es un chef cuisinier expert et nutritionniste. Cree une recette {cuisine.lower()} originale et delicieuse.

Contraintes :
- Utilise principalement ces ingredients : {", ".join(ingredients)}
- Pour {personnes} personne(s)
- {regime_text}
- Style de cuisine : {cuisine}
- Reponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.

Format JSON attendu :
{{
  "nom": "Nom du plat",
  "origine": "Pays / region (ex: Maroc, Japon, France)",
  "categorie": "Plat principal / Entree / Dessert",
  "temps_total": "ex: 45 min",
  "ingredients": ["200g de poulet", "1 oignon", ...],
  "etapes": ["Etape 1 detaillee avec verbes d'action", "Etape 2 detaillee", ...],
  "astuce_chef": "Une astuce courte pour reussir le plat",
  "nutrition": {{
    "calories_par_personne": 450,
    "proteines_g": 25,
    "glucides_g": 50,
    "lipides_g": 15,
    "fibres_g": 5
  }},
  "indicateur_sante": "vert",
  "indicateur_label": "Plat equilibre",
  "anecdote_pays": "2-3 phrases sur l'origine culturelle du plat",
  "fun_fact": "1 fait amusant et court (max 20 mots)",
  "niveau_authenticite": "Traditionnel",
  "score_compatibilite": 85,
  "substitutions": {{
    "ingredient_original_1": ["substitut 1", "substitut 2"],
    "ingredient_original_2": ["substitut 1"]
  }},
  "cout_estime_eur": 12.50,
  "cout_par_personne_eur": 3.10,
  "nom_image": "biryani"
}}

Regles :
- indicateur_sante : "vert" = equilibre/leger, "orange" = correct mais riche, "rouge" = tres riche
- niveau_authenticite : "Traditionnel", "Adapte", ou "Fusion"
- score_compatibilite : note 0-100 de coherence des ingredients avec la cuisine
- etapes : minimum 6 etapes detaillees
- substitutions : pour les 3-4 ingredients principaux, propose 1-2 alternatives accessibles
- cout_estime_eur : estimation realiste du cout total des ingredients en euros (prix supermarche France 2026), arrondi
- nom_image : UN ou DEUX mots en ANGLAIS qui identifient le type de plat (ex: "biryani", "tagine", "pad thai", "carbonara", "ramen", "couscous", "paella", "sushi"). Sert pour chercher une vraie photo de plat. Toujours minuscule, sans accent."""

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        data = json.loads(text)
        data["source"] = "Chef du monde"
        data["image_url"] = None
        data["drapeau"] = get_drapeau(data.get("origine", ""))
        return data
    except (json.JSONDecodeError, Exception):
        return None


def get_recipe(ingredients: list[str], cuisine: str, personnes: int = 2, regime: str = "Aucun") -> dict:
    """Point d'entree principal : strategie mix TheMealDB + Claude."""
    if cuisine in ("Orientale", "Asiatique", "Africaine", "Americaine"):
        recipe = generate_with_claude(ingredients, cuisine, personnes, regime)
        if recipe:
            return recipe

    recipe = search_themealdb(ingredients, cuisine)
    if recipe:
        return recipe

    recipe = generate_with_claude(ingredients, cuisine, personnes, regime)
    if recipe:
        return recipe

    return {
        "nom": "Aucune recette trouvee",
        "origine": "-",
        "drapeau": "🌍",
        "ingredients": ingredients,
        "etapes": ["Essaie avec d'autres aliments ou verifie ta cle API Anthropic dans le fichier .env"],
        "source": "Erreur",
        "image_url": None,
    }


def adapter_portions(recipe: dict, ratio: float) -> dict:
    """Adapte les quantites et la nutrition selon un ratio (ex: 2 = double)."""
    import re
    adapted = recipe.copy()
    new_ingredients = []
    pattern = re.compile(r"(\d+[,.]?\d*)\s*(g|kg|ml|cl|l|cuilleres?|c\.|tasses?|pincees?)?", re.IGNORECASE)

    for ing in recipe.get("ingredients", []):
        def multiply(match):
            num_str = match.group(1).replace(",", ".")
            unit = match.group(2) or ""
            try:
                num = float(num_str)
                new_num = num * ratio
                if new_num == int(new_num):
                    return f"{int(new_num)}{' ' + unit if unit else ''}"
                return f"{new_num:.1f}{' ' + unit if unit else ''}"
            except ValueError:
                return match.group(0)

        new_ing = pattern.sub(multiply, ing, count=1)
        new_ingredients.append(new_ing)

    adapted["ingredients"] = new_ingredients

    # Adapter aussi les calories
    if "nutrition" in adapted:
        # Les valeurs nutritionnelles restent par personne, on ne touche pas
        pass

    return adapted


def score_nutritionnel(ingredients: list[str]) -> dict:
    """Score nutritionnel simple a partir des ingredients (calcul local rapide)."""
    proteines = {"poulet", "boeuf", "agneau", "porc", "poisson", "saumon", "thon", "oeuf", "tofu", "lentilles", "pois chiches", "haricots"}
    legumes = {"tomate", "oignon", "carotte", "courgette", "poivron", "epinards", "salade", "ail", "champignon", "brocoli", "aubergine", "concombre"}
    feculents = {"riz", "pates", "pomme de terre", "pain", "semoule", "quinoa", "boulgour"}

    ing_lower = [i.lower() for i in ingredients]
    has_prot = any(p in " ".join(ing_lower) for p in proteines)
    has_leg = any(l in " ".join(ing_lower) for l in legumes)
    has_fec = any(f in " ".join(ing_lower) for f in feculents)

    score = sum([has_prot, has_leg, has_fec])
    labels = {3: "Equilibre", 2: "Correct", 1: "A completer", 0: "Desequilibre"}

    return {
        "score": score,
        "label": labels[score],
        "proteines": has_prot,
        "legumes": has_leg,
        "feculents": has_fec,
    }
