"""
Recuperation d'image pour un plat. Strategie 2 niveaux :
1. Spoonacular API (vraies photos de plats, rapide ~300ms) - si SPOONACULAR_API_KEY definie
2. Pollinations.ai (generation IA, plus lent ~5-15s, illimite gratuit) - fallback
"""

import hashlib
import os
import urllib.parse

import requests

# Note : pas de dotenv en serverless Vercel (env vars injectees directement).

SPOONACULAR_BASE = "https://api.spoonacular.com/recipes/complexSearch"
_spoonacular_cache: dict[str, str | None] = {}


def _spoonacular_image(plat: str) -> str | None:
    """Cherche une image de plat reelle via Spoonacular. Cache en memoire."""
    api_key = os.getenv("SPOONACULAR_API_KEY")
    if not api_key or api_key == "ta_cle_ici":
        return None

    # Cache : meme plat = pas de nouvelle requete (limite 150/jour)
    cache_key = plat.lower().strip()
    if cache_key in _spoonacular_cache:
        return _spoonacular_cache[cache_key]

    # Simplifie le titre pour la recherche : retire les sous-titres apres "-" ou "("
    query = plat.split(" - ")[0].split(" (")[0].strip()[:80]

    try:
        r = requests.get(
            SPOONACULAR_BASE,
            params={"query": query, "number": 1, "apiKey": api_key},
            timeout=4,
        )
        if r.status_code == 200:
            results = r.json().get("results", [])
            if results and results[0].get("image"):
                url = results[0]["image"]
                _spoonacular_cache[cache_key] = url
                return url
    except (requests.RequestException, ValueError):
        pass

    _spoonacular_cache[cache_key] = None
    return None


def _pollinations_url(plat: str, origine: str = "") -> str:
    """Genere une URL Pollinations.ai pour une photo IA du plat (fallback)."""
    prompt = f"professional food photography of {plat}"
    if origine:
        prompt += f", {origine} cuisine"
    prompt += ", appetizing, top view, restaurant plating, warm light, hyperrealistic, 4k"

    seed = int(hashlib.md5(plat.encode()).hexdigest()[:8], 16) % 1000000
    encoded = urllib.parse.quote(prompt)
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width=640&height=480&model=turbo&nologo=true&seed={seed}"
    )


def image_url_for(plat: str, origine: str = "", nom_image: str = "") -> str:
    """Point d'entree : Spoonacular d'abord (vraies photos), Pollinations en fallback.

    nom_image : 1-2 mots anglais qui identifient le type de plat (ex: "biryani", "tagine").
    Genere par Claude pour ameliorer le match Spoonacular. Si vide, fallback sur le titre complet.
    """
    # 1. Spoonacular avec le nom court anglais (meilleur match)
    if nom_image:
        spoon = _spoonacular_image(nom_image)
        if spoon:
            return spoon
    # 2. Spoonacular avec le titre complet
    spoon = _spoonacular_image(plat)
    if spoon:
        return spoon
    # 3. Pollinations IA en fallback
    return _pollinations_url(plat, origine)
