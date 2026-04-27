/**
 * Apartment type definitions.
 *
 * `labelKey` maps to  pricing.apartments.<key>  in en.json / fi.json.
 * All display strings are resolved at render time via useTranslations(),
 * so no EN/FI text lives in this file.
 */
export const APARTMENT_TYPES = [
  { key: "studio", labelKey: "studio", size: "20–35 m²", emoji: "🏠" },
  { key: "two", labelKey: "two", size: "40–65 m²", emoji: "🏡" },
  { key: "three", labelKey: "three", size: "60–85 m²", emoji: "🏘" },
  { key: "four", labelKey: "four", size: "80–120+ m²", emoji: "🏗" },
];
