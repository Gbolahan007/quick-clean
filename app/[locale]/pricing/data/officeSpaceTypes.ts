// app/[locale]/pricing/data/officeSpaceTypes.ts
// Office space sizes — aligned with pricing document (50–300 sqm range).
// Sizes updated to match the actual Tampere small business office market.

import type { ApartmentType } from "@/app/types/booking";

export const OFFICE_SPACE_TYPES: ApartmentType[] = [
  {
    key: "small-office",
    labelKey: "smallOffice",
    emoji: "🏢",
    size: "50–100 m²", // updated: document starts at 50 sqm
    squareMeters: 75,
    numberOfRooms: 3, // ~3 rooms: open area + meeting room + kitchen
  },
  {
    key: "medium-office",
    labelKey: "mediumOffice",
    emoji: "🏬",
    size: "100–150 m²",
    squareMeters: 125,
    numberOfRooms: 5,
  },
  {
    key: "large-office",
    labelKey: "largeOffice",
    emoji: "🏗",
    size: "150–300 m²",
    squareMeters: 225,
    numberOfRooms: 8,
  },
  {
    key: "xl-office",
    labelKey: "xlOffice",
    emoji: "🏛",
    size: "300+ m²",
    squareMeters: 400,
    numberOfRooms: 12,
  },
];
