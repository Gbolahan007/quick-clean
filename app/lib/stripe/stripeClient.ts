// app/lib/stripe/stripeClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stripe SDK singleton + Stripe Customer lifecycle management.
//
// SECURITY: The Stripe secret key is NEVER exposed to the client.
//   It only lives in server-side environment variables.
//   All Stripe API calls are made server-side only.
//
// WHY A SINGLETON:
//   Avoids creating a new Stripe instance on every request.
//   In serverless (Vercel), module-level singletons persist within
//   a warm function invocation — this is the correct pattern.
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ── Stripe SDK singleton ──────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!key.startsWith("sk_")) {
      throw new Error(
        "STRIPE_SECRET_KEY appears invalid — must start with sk_live_ or sk_test_",
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// ── Supabase service client (server-side only) ────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Stripe Customer lifecycle ─────────────────────────────────────────────────
//
// RULES:
//   1. Never create duplicate Stripe Customers for the same email.
//   2. If customers.stripe_customer_id is set → use it directly.
//   3. If not set → search Stripe by email → reuse if found → else create.
//   4. Always persist the stripe_customer_id back to our customers table.
//
// WHY WE SEARCH BY EMAIL BEFORE CREATING:
//   A customer may have been manually created in the Stripe dashboard, or
//   our DB row may have been wiped in a migration without clearing Stripe.
//   This prevents orphaned or duplicate Stripe Customers.

export interface GetOrCreateStripeCustomerInput {
  platformCustomerId: string; // our customers.id UUID
  email: string;
  fullName: string;
  phone?: string;
}

export interface GetOrCreateStripeCustomerResult {
  stripeCustomerId: string;
  created: boolean; // true = new Stripe Customer was created
}

export async function getOrCreateStripeCustomer(
  input: GetOrCreateStripeCustomerInput,
): Promise<GetOrCreateStripeCustomerResult> {
  const supabase = getSupabase();
  const stripe = getStripe();

  // ── Step 1: Check if we already have a stripe_customer_id stored ──────────
  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", input.platformCustomerId)
    .single();

  if (customer?.stripe_customer_id) {
    // Verify the customer still exists in Stripe (it could have been deleted there)
    try {
      const existing = await stripe.customers.retrieve(
        customer.stripe_customer_id,
      );
      if (!existing.deleted) {
        return {
          stripeCustomerId: customer.stripe_customer_id,
          created: false,
        };
      }
      // If deleted in Stripe, fall through to create a new one
      console.warn(
        `[stripe] Customer ${customer.stripe_customer_id} was deleted in Stripe. Creating new one.`,
      );
    } catch {
      // Customer not found in Stripe — fall through to create
      console.warn(
        `[stripe] Could not retrieve ${customer.stripe_customer_id} from Stripe. Creating new.`,
      );
    }
  }

  // ── Step 2: Search Stripe by email to prevent duplicates ─────────────────
  const searchResult = await stripe.customers.search({
    query: `email:'${input.email}'`,
    limit: 1,
  });

  let stripeCustomerId: string;
  let created = false;

  if (searchResult.data.length > 0) {
    // Reuse the existing Stripe Customer
    stripeCustomerId = searchResult.data[0].id;
    console.log(
      `[stripe] Reusing existing Stripe Customer: ${stripeCustomerId}`,
    );
  } else {
    // ── Step 3: Create new Stripe Customer ──────────────────────────────────
    const newCustomer = await stripe.customers.create({
      email: input.email,
      name: input.fullName,
      phone: input.phone,
      metadata: {
        platform_customer_id: input.platformCustomerId,
      },
    });
    stripeCustomerId = newCustomer.id;
    created = true;
    console.log(`[stripe] Created new Stripe Customer: ${stripeCustomerId}`);
  }

  // ── Step 4: Persist stripe_customer_id to our customers table ────────────
  await supabase
    .from("customers")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", input.platformCustomerId);

  return { stripeCustomerId, created };
}
