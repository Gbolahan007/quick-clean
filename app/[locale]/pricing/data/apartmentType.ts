export interface ApartmentType {
  key: string;
  labelKey: string;
  size: string;
  emoji: string;
  squareMeters: number;
  numberOfRooms: number;
}

export const APARTMENT_TYPES: ApartmentType[] = [
  {
    key: "studio",
    labelKey: "studio",
    size: "up to 35 m²",
    emoji: "🏠",
    squareMeters: 30,
    numberOfRooms: 1,
  },
  {
    key: "two",
    labelKey: "two",
    size: "35–55 m²",
    emoji: "🏡",
    squareMeters: 45,
    numberOfRooms: 2,
  },
  {
    key: "three",
    labelKey: "three",
    size: "55–75 m²",
    emoji: "🏘",
    squareMeters: 65,
    numberOfRooms: 3,
  },
  {
    key: "four",
    labelKey: "four",
    size: "75–100 m²",
    emoji: "🏢",
    squareMeters: 87,
    numberOfRooms: 4,
  },
];
