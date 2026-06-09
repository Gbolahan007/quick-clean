// app/lib/stripe/priceResolver.ts
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: Server-side Stripe Price ID resolution.
//
// SECURITY CRITICAL:
//   The client submits serviceType, frequency, and apartmentKey.
//   We NEVER accept a price_id from the client.
//   We NEVER use the client's finalPrice to charge Stripe.
//   All Stripe Price IDs are resolved server-side from environment variables.
//   This makes it physically impossible for a client to tamper with the amount.
//
// HOW IT WORKS:
//   serviceType + frequency + apartmentKey → env var name → price_xxx
//   e.g. maintenance + weekly + studio → STRIPE_PRICE_MAINTENANCE_WEEKLY_STUDIO
//        → process.env.STRIPE_PRICE_MAINTENANCE_WEEKLY_STUDIO
//        → "price_1TeDndPEntbTJ60VaqUOY9kA"
//
// CHECKOUT MODE:
//   "payment"      → one-time charge (maintenance one-time, deep one-time, moveout)
//   "subscription" → monthly recurring (all subscription plans)
//
// NOTE ON DEEP QUARTERLY:
//   deepQuarterly uses interval=3 months in Stripe (not monthly).
//   This is the one exception to "all subscriptions bill monthly".
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PriceResolutionInput,
  PriceResolutionResult,
  CheckoutMode,
} from "./types";

// ── Apartment key normalisation ───────────────────────────────────────────────
// Client sends "studio" | "two" | "three" | "four"
// Env var suffix uses "STUDIO" | "TWO" | "THREE" | "FOUR"
const APT_SUFFIX: Record<string, string> = {
  studio: "STUDIO",
  two: "TWO",
  three: "THREE",
  four: "FOUR",
};

// ── Checkout mode determination ───────────────────────────────────────────────
const SUBSCRIPTION_FREQUENCIES = new Set([
  "weekly",
  "biweekly",
  "monthly",
  "deepMonthly",
  "deepQuarterly",
  "quarterly",
]);

function resolveMode(frequency: string): CheckoutMode {
  return SUBSCRIPTION_FREQUENCIES.has(frequency) ? "subscription" : "payment";
}

// Quarterly plans bill every 3 months (interval_count=3 in Stripe).
// All other subscription plans bill every 1 month (interval_count=1).
function resolveIntervalCount(frequency: string): number {
  return frequency === "deepQuarterly" || frequency === "quarterly" ? 3 : 1;
}

// ── Env var name builder ──────────────────────────────────────────────────────
// Returns the process.env key for a given service+frequency+apartment combination.

function buildEnvKey(
  serviceType: string,
  frequency: string,
  apartmentKey: string,
): string {
  const apt = APT_SUFFIX[apartmentKey];
  if (!apt) {
    throw new Error(
      `Unknown apartment key: "${apartmentKey}". ` +
        `Expected one of: ${Object.keys(APT_SUFFIX).join(", ")}`,
    );
  }

  // ── Maintenance ────────────────────────────────────────────────────────────
  if (serviceType === "maintenance") {
    switch (frequency) {
      case "weekly":
        return `STRIPE_PRICE_MAINTENANCE_WEEKLY_${apt}`;
      case "biweekly":
        return `STRIPE_PRICE_MAINTENANCE_BIWEEKLY_${apt}`;
      case "monthly":
        return `STRIPE_PRICE_MAINTENANCE_MONTHLY_${apt}`;
      case "one-time":
        return `STRIPE_PRICE_MAINTENANCE_ONETIME_${apt}`;
      default:
        throw new Error(`Unknown frequency "${frequency}" for maintenance`);
    }
  }

  // ── Deep cleaning ──────────────────────────────────────────────────────────
  if (serviceType === "deep") {
    switch (frequency) {
      case "deepMonthly":
      case "monthly":
        return `STRIPE_PRICE_DEEP_MONTHLY_${apt}`;
      case "deepQuarterly":
      case "quarterly":
        return `STRIPE_PRICE_DEEP_QUARTERLY_${apt}`;
      case "deepOnetime":
      case "one-time":
        return `STRIPE_PRICE_DEEP_ONETIME_${apt}`;
      default:
        throw new Error(`Unknown frequency "${frequency}" for deep cleaning`);
    }
  }

  // ── Move-out cleaning ──────────────────────────────────────────────────────
  if (serviceType === "moveout") {
    // Move-out is always one-time, apartment size drives price
    return `STRIPE_PRICE_MOVEOUT_${apt}`;
  }

  throw new Error(
    `Unknown serviceType: "${serviceType}". ` +
      `Expected: maintenance | deep | moveout`,
  );
}

// ── Public resolver ───────────────────────────────────────────────────────────
// This is the ONLY function the rest of the system should call.
// It throws if the Price ID is missing — never silently returns undefined.

export function resolveStripePrice(
  input: PriceResolutionInput,
): PriceResolutionResult {
  const { serviceType, frequency, apartmentKey } = input;

  const envKey = buildEnvKey(serviceType, frequency, apartmentKey);
  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured. ` +
        `Expected env var: ${envKey}. ` +
        `Check .env.local — this combination may not be set up yet. ` +
        `serviceType=${serviceType} frequency=${frequency} apartmentKey=${apartmentKey}`,
    );
  }

  // Validate format: Stripe Price IDs always start with "price_"
  if (!priceId.startsWith("price_")) {
    throw new Error(
      `Invalid Stripe Price ID in env var ${envKey}: "${priceId}". ` +
        `Price IDs must start with "price_". ` +
        `Check the value in your Stripe dashboard.`,
    );
  }

  const mode = resolveMode(frequency);
  const intervalCount = resolveIntervalCount(frequency);

  return { priceId, mode, intervalCount };
}

// ── Visits per month resolver ─────────────────────────────────────────────────
// Used to snapshot visits_per_month on the booking row at Checkout time.
// Scheduling system reads this after invoice.paid to generate visit slots.
// Returns null for one-time payments (no recurring visits).

export function resolveVisitsPerMonth(frequency: string): number | null {
  switch (frequency) {
    case "weekly":
      return 4;
    case "biweekly":
      return 2;
    case "monthly":
      return 1;
    case "deepMonthly":
      return 1;
    // Quarterly: 1 visit every 3 months — not per month.
    // Store NULL and use visits_per_year=4 logic in scheduling instead.
    case "deepQuarterly":
    case "quarterly":
      return null;
    // One-time: no recurring visits
    case "one-time":
    case "deepOnetime":
    case "moveout":
      return null;
    default:
      return null;
  }
}

// ── Office cleaning (appended) ─────────────────────────────────────────────
// Called with apartmentKey = "tier1" | "tier2" | "tier3"
// Add to .env.local:
//   STRIPE_PRICE_OFFICE_TIER1=price_xxx   (2–10 hrs/week tier)
//   STRIPE_PRICE_OFFICE_TIER2=price_xxx   (11–20 hrs/week tier)
//   STRIPE_PRICE_OFFICE_TIER3=price_xxx   (21+ hrs/week tier)
// All three are monthly recurring Prices in Stripe.
// The amount in each Price should match the expected monthly contract value
// for a representative office at that tier. Final amount is agreed in contract.
// For variable-amount billing, replace with dynamic stripe.prices.create().
//
// This block is reached when serviceType === "office" — add to buildEnvKey():
// if (serviceType === "office") {
//   const tierSuffix = apartmentKey.toUpperCase(); // "TIER1" | "TIER2" | "TIER3"
//   return `STRIPE_PRICE_OFFICE_${tierSuffix}`;
// }
