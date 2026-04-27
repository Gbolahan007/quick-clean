/**
 * Add-on service definitions.
 *
 * labelKey  → pricing.addons.<key>.label  in en.json / fi.json
 * noteKey   → pricing.addons.<key>.note   in en.json / fi.json  (or null)
 *
 * prominent  true  → show "Recommended" badge for Kolmio & Neliö apartments
 * perLoad    true  → render a quantity stepper instead of a single checkbox
 */
export const ADDONS = [
  {
    key: "sauna",
    labelKey: "sauna",
    price: 55,
    deducted: 36,
    noteKey: null,
    prominent: true,
    perLoad: false,
  },
  {
    key: "oven",
    labelKey: "oven",
    price: 55,
    deducted: 36,
    noteKey: null,
    prominent: false,
    perLoad: false,
  },
  {
    key: "fridge",
    labelKey: "fridge",
    price: 55,
    deducted: 36,
    noteKey: "fridge", // "Must be empty and defrosted before cleaning."
    prominent: false,
    perLoad: false,
  },
  {
    key: "trash",
    labelKey: "trash",
    price: 30,
    deducted: 20,
    noteKey: null,
    prominent: false,
    perLoad: false,
  },
  {
    key: "ironing",
    labelKey: "ironing",
    price: 30,
    deducted: 20,
    noteKey: null,
    prominent: false,
    perLoad: false,
  },
  {
    key: "laundry",
    labelKey: "laundry",
    price: 25,
    deducted: 16,
    noteKey: null,
    prominent: false,
    perLoad: true,
  },
];
