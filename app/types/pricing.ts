export interface Plan {
  key: string;
  labelKey: string;
  badge: string | null;
  discountKey: string | null;
  visitInfoKey: string | null;
  priceType: string;
  prices: number[];
  deducted: number[];
  durations: string[];
  cleaners?: (string | number)[];

  // maintenance-only
  visits?: number | null;

  // deep-only
  visitsCount?: number | null;
  visitsPerYear?: number | null;
}
