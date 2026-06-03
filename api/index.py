"""
Apollon API — serverless function Vercel.

FastAPI single-file qui wrappe le moteur Python (Claude + Spoonacular).
Vercel detecte automatiquement l'export `app` comme ASGI handler.

Routing : vercel.json rewrite /api/(.*) -> /api/index (cette file),
puis FastAPI dispatch en interne selon le path.
"""

import os
import sys
from pathlib import Path

# Vercel : ajouter le dossier api au sys.path pour les imports locaux
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recipe_engine import get_recipe  # noqa: E402
from image_gen import image_url_for  # noqa: E402

app = FastAPI(
    title="Apollon API",
    description="Generation de recettes IA + images Spoonacular.",
    version="1.0.0",
)

# CORS : meme-origine en prod (rewrite Vercel) + dev local
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic models ----------

class RecipeRequest(BaseModel):
    ingredients: list[str] = Field(..., min_length=1)
    cuisine: str = Field(default="Surprends-moi")
    personnes: int = Field(default=2, ge=1, le=20)
    regime: str = Field(default="Aucun")


# ---------- Endpoints ----------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/recipe")
def post_recipe(payload: RecipeRequest):
    try:
        recipe = get_recipe(
            ingredients=payload.ingredients,
            cuisine=payload.cuisine,
            personnes=payload.personnes,
            regime=payload.regime,
        )
        return recipe
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail={"error": "recipe_generation_failed", "message": str(exc)},
        )


@app.get("/api/image")
def get_image(
    plat: str = Query(...),
    origine: str = Query(default=""),
    nom_image: str = Query(default=""),
):
    try:
        url = image_url_for(plat=plat, origine=origine, nom_image=nom_image)
        return {"image_url": url}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail={"error": "image_lookup_failed", "message": str(exc)},
        )


@app.get("/api")
def api_root():
    return {
        "name": "Apollon API",
        "version": "1.0.0",
        "endpoints": ["/api/health", "/api/recipe", "/api/image"],
    }
