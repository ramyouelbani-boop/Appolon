"""
Export PDF de la recette via fpdf2.
Retourne les bytes du PDF pour st.download_button.
"""

from fpdf import FPDF
from fpdf.enums import XPos, YPos


def _clean(text: str) -> str:
    """Remplace les caracteres unicode non supportes par latin-1 (fpdf2 polices par defaut)."""
    if not text:
        return ""
    replacements = {
        "’": "'", "‘": "'", "“": '"', "”": '"',
        "–": "-", "—": "-", "…": "...", " ": " ",
        "•": "-",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def build_pdf(recipe: dict, personnes: int, regime: str) -> bytes:
    """Genere le PDF de la recette et retourne les bytes."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    NEXT_LINE = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}

    # Titre
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(20, 20, 20)
    pdf.multi_cell(0, 10, _clean(recipe.get("nom", "Recette")), **NEXT_LINE)
    pdf.ln(2)

    # Sous-titre
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(100, 100, 100)
    sub = f"Origine : {recipe.get('origine', '-')} | {recipe.get('categorie', '')} | {personnes} personne(s)"
    if regime != "Aucun":
        sub += f" | {regime}"
    pdf.multi_cell(0, 6, _clean(sub), **NEXT_LINE)
    pdf.ln(4)

    # Temps
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 7, _clean(f"Temps total : {recipe.get('temps_total', 'N/A')}"), **NEXT_LINE)
    pdf.ln(4)

    # Ingredients
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Ingredients", **NEXT_LINE)
    pdf.set_font("Helvetica", "", 11)
    for ing in recipe.get("ingredients", []):
        pdf.multi_cell(0, 6, _clean(f"- {ing}"), **NEXT_LINE)
    pdf.ln(4)

    # Etapes
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Preparation", **NEXT_LINE)
    pdf.set_font("Helvetica", "", 11)
    for i, etape in enumerate(recipe.get("etapes", []), 1):
        pdf.multi_cell(0, 6, _clean(f"{i}. {etape}"), **NEXT_LINE)
        pdf.ln(1)

    # Astuce chef
    if recipe.get("astuce_chef"):
        pdf.ln(3)
        pdf.set_font("Helvetica", "BI", 12)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(0, 6, _clean(f"Astuce du chef : {recipe['astuce_chef']}"), **NEXT_LINE)

    # Footer
    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, _clean(f"Genere avec Apollon - Source : {recipe.get('source', 'N/A')}"), **NEXT_LINE)

    # fpdf2 : .output() retourne un bytearray, on le convertit en bytes pour Streamlit
    return bytes(pdf.output())
