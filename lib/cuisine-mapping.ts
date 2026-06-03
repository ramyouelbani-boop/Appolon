/**
 * Mapping country_id (planète 3D) → label de cuisine du formulaire /compose.
 * Les 6 groupes correspondent aux options du selector "Cuisine" :
 * Européenne, Asiatique, Orientale, Africaine, Américaine, Surprends-moi.
 */

export type CuisineLabel =
  | "Européenne"
  | "Asiatique"
  | "Orientale"
  | "Africaine"
  | "Américaine"
  | "Surprends-moi";

export const CUISINE_OPTIONS: ReadonlyArray<CuisineLabel> = [
  "Européenne",
  "Asiatique",
  "Orientale",
  "Africaine",
  "Américaine",
  "Surprends-moi",
];

const COUNTRY_TO_CUISINE: Record<string, CuisineLabel> = {
  // Europe
  france: "Européenne",
  italie: "Européenne",
  espagne: "Européenne",
  grece: "Européenne",
  // Asie
  chine: "Asiatique",
  japon: "Asiatique",
  thailande: "Asiatique",
  vietnam: "Asiatique",
  inde: "Asiatique",
  coree: "Asiatique",
  // Orient / Méditerranée Sud-Est
  turquie: "Orientale",
  liban: "Orientale",
  // Afrique du Nord & Afrique
  maroc: "Africaine",
  algerie: "Africaine",
  tunisie: "Africaine",
  egypte: "Africaine",
  kenya: "Africaine",
  // Amériques
  usa: "Américaine",
  mexique: "Américaine",
};

export function countryIdToCuisine(
  countryId: string | null | undefined,
): CuisineLabel {
  if (!countryId) return "Surprends-moi";
  const key = countryId.toLowerCase();
  return COUNTRY_TO_CUISINE[key] ?? "Surprends-moi";
}
