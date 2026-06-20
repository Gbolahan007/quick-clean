-- ============================================================================
-- CLEANING SERVICE PLATFORM — COMPLETE SCHEMA
-- Frosh | Tampere, Finland
-- ============================================================================
--
-- VERSION HISTORY
--   v1  — Phase 1 MVP: residential + office bookings, guest-first auth
--   v2  — Stripe payment integration: monthly billing, subscriptions,
--          idempotent webhooks, full payment history
--   v3  — Post-payment magic link authentication, customer dashboard,
--          guest-to-auth linking, rate limiting, email normalisation
--
-- TABLE INVENTORY (14 tables + admin views)
-- ─────────────────────────────────────────────────────────────────────────────
--   Core identity
--     profiles                  — ADMIN ONLY. Never created for customers.
--     customers                 — guest + authenticated customer identity
--     addresses                 — service locations
--
--   Service catalog
--     services                  — cleaning service types
--     subscription_plans        — visit frequency plans (weekly/biweekly/monthly)
--
--   Booking system
--     bookings                  — unified residential + office bookings
--     office_schedule_rules     — recurring weekly pattern for office contracts
--     booking_extras            — residential add-on services (analytics)
--
--   Payment system (v2)
--     payments                  — one row per Stripe invoice/charge
--     stripe_webhook_events     — idempotency log for Stripe webhook delivery
--     customer_payment_methods  — saved cards for authenticated customers
--
--   Operations
--     availability_slots        — residential booking time slots
--     quote_requests            — lead generation / enquiry capture
--
-- ============================================================================
-- AUTHENTICATION ARCHITECTURE (v3)
-- ============================================================================
--
-- CUSTOMER FLOW (the only flow that matters for 99% of users):

--   1. Customer visits site — no account needed
--   2. Customer books → customers row created (auth_user_id = NULL)
--   3. Customer pays via Stripe Checkout
--   4. Stripe webhook confirms payment → booking confirmed
--   5. Success page offers "save your booking — get a free account"
--   6. Customer enters email → sendMagicLink() server action fires
--   7. Supabase sends magic link email
--   8. Customer clicks link → /[locale]/auth/callback?code=xxx
--   9. Route handler exchanges code for session cookie
--  10. on_auth_user_created trigger fires → link_customer_to_auth()
--      → customers.auth_user_id = auth.users.id
--  11. Customer redirected to /[locale]/dashboard
--  12. RLS policies use auth_user_id to scope all data to this customer
--
-- PROFILES TABLE IS NOT PART OF THIS FLOW.
-- Customers NEVER get a profiles row. profiles is for admins only.
-- The trigger handle_new_auth_user() ONLY updates customers.auth_user_id.
-- It does NOT touch profiles.
--
-- RETURNING CUSTOMER FLOW:
--   Option A: Magic link (always works — Supabase sends new OTP)
--   Option B: Password (after customer sets one in dashboard → Profile)
--
-- GUEST-TO-AUTH LINKING GUARANTEE:
--   - customers.email is UNIQUE and lowercase — no duplicates possible
--   - link_customer_to_auth() uses WHERE auth_user_id IS NULL — never overwrites
--   - Postgres UPDATE is atomic — race conditions on simultaneous clicks are safe
--   - on_auth_user_created trigger is fault-tolerant — a linking failure
--     never blocks auth.users INSERT (wrapped in EXCEPTION handler)
--
-- ============================================================================
-- ARCHITECTURE PRINCIPLES
-- ─────────────────────────────────────────────────────────────────────────────
--   1. Guest-first: customers exists independently of auth.users
--   2. Snapshot pattern: bookings stores denormalized service/pricing data
--      so historical records are immune to catalog changes
--   3. Stripe is billing-only: visit cadence, scheduling, cleaner assignment
--      are all platform concerns — Stripe only charges once per month
--   4. ALL subscription plans bill monthly regardless of visit frequency
--      (weekly = 4 visits/month billed once, biweekly = 2 visits/month, etc.)
--   5. Idempotent webhooks: every Stripe event is logged before processing
--      so retries never cause duplicate side-effects
--   6. Non-blocking payments: email/booking confirmation is safe even if
--      Stripe webhook fires twice — the stripe_webhook_events table deduplicates
--   7. Auth is optional and post-payment: customers are never forced to create
--      an account before booking or paying
--   8. Email is normalised to lowercase on INSERT — prevents case mismatch
--      between booking email and auth email during magic link linking
--
-- ============================================================================


-- ============================================================================
-- 0. SHARED TRIGGER FUNCTION
-- ============================================================================
-- Auto-updates updated_at on any table that has this trigger attached.
-- Created first because every subsequent table trigger depends on it.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- PURPOSE: Extends Supabase auth.users with role and admin metadata.
--
-- !! ADMIN ONLY — CUSTOMERS NEVER GET A PROFILES ROW !!
--
-- This table is ONLY created manually for admin users. The authentication
-- trigger (on_auth_user_created) does NOT insert into this table.
-- When a customer authenticates via magic link, only customers.auth_user_id
-- is updated — profiles is never touched.
--
-- If you see a customer row in profiles, something is wrong. Delete it.
--
-- KEY RELATIONSHIPS:
--   profiles.id → auth.users.id (1:1, cascade delete)
--
-- HOW TO CREATE AN ADMIN:
--   1. Create the user in Supabase Auth dashboard (or via invite)
--   2. Manually INSERT into profiles:
--      INSERT INTO profiles (id, full_name, role)
--      VALUES ('<auth_user_id>', 'Admin Name', 'admin');
-- ============================================================================

CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name  TEXT,  -- nullable: admin may not have full name set
    phone      TEXT,
    role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    -- Only 'admin' allowed — customers use the customers table, not profiles.
    -- The 'customer' role has been intentionally removed to prevent misuse.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================
-- PURPOSE: Standalone customer identity — the single source of truth for
--   who is booking, regardless of whether they have a Supabase account.
--
-- GUEST FLOW: Customer books → customers row created (auth_user_id = NULL)
-- AUTH UPGRADE: Customer authenticates via magic link →
--   on_auth_user_created trigger fires → link_customer_to_auth() →
--   customers.auth_user_id = auth.users.id
--   All booking history is preserved. No data loss. No duplicate rows.
--
-- EMAIL NORMALISATION:
--   email is stored as LOWER(TRIM(email)) everywhere.
--   The CHECK constraint enforces this at the DB level.
--   This prevents case mismatch: "Jane@gmail.com" at booking time vs
--   "jane@gmail.com" at auth time — both resolve to the same customer row.
--
-- RATE LIMITING:
--   magic_link_sent_at tracks when the last magic link was sent.
--   The sendMagicLink() server action refuses to send again within 60 seconds.
--   This prevents the endpoint from being used as a free email spam tool.
--
-- STRIPE LINK: stripe_customer_id is set the moment a Checkout Session
--   is created — even before the customer pays. It is reused across all
--   future bookings so Stripe has one customer record per person.
--
-- KEY RELATIONSHIPS:
--   customers.auth_user_id → auth.users.id (optional, ON DELETE SET NULL)
--   customers.stripe_customer_id → Stripe Customer object (external)
--   bookings.customer_id → customers.id
--   addresses.customer_id → customers.id
--   payments (via bookings join)
--
-- WHY auth_user_id is ON DELETE SET NULL (not CASCADE):
--   If a Supabase auth user is deleted (account closure), we keep the
--   customer record and all their booking history for financial/legal records.
--   Only the auth link is severed.
-- ============================================================================

CREATE TABLE customers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stored as LOWER(TRIM(email)) — enforced by CHECK constraint.
    -- UNIQUE because email is how we deduplicate returning guests and
    -- how we match customers to auth.users during magic link linking.
    email        TEXT NOT NULL UNIQUE CHECK (email = LOWER(TRIM(email))),
    full_name    TEXT NOT NULL,
    phone        TEXT,

    -- NULL until the customer optionally authenticates via magic link.
    -- Populated automatically by handle_new_auth_user trigger (section 15).
    -- ON DELETE SET NULL: deleting auth user preserves booking history.
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- ── Stripe ───────────────────────────────────────────────────────────────
    -- Set during the first Checkout Session creation.
    -- UNIQUE: one Stripe Customer per platform customer.
    stripe_customer_id TEXT UNIQUE,

    -- ── Magic link rate limiting (v3) ─────────────────────────────────────────
    -- Updated by sendMagicLink() server action on each send.
    -- Checked before each send — refuses if < 60 seconds since last send.
    magic_link_sent_at TIMESTAMPTZ,

    -- ── Auth conversion tracking (v3) ─────────────────────────────────────────
    -- Set by link_customer_to_auth() when auth_user_id is first populated.
    -- Useful for: conversion analytics, welcome email logic,
    -- suppressing "create account" CTA on success page for returning customers.
    onboarding_completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email                ON customers(email);
CREATE INDEX idx_customers_auth_user_id         ON customers(auth_user_id);
CREATE INDEX idx_customers_stripe_customer_id   ON customers(stripe_customer_id);
CREATE INDEX idx_customers_magic_link_sent_at   ON customers(magic_link_sent_at)
  WHERE magic_link_sent_at IS NOT NULL;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own record"
    ON customers FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Customer can update own record"
    ON customers FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Guest INSERT happens via service role key in server actions.
-- No RLS INSERT policy needed — service role bypasses RLS.

CREATE POLICY "Admins can manage all customers"
    ON customers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 3. ADDRESSES TABLE
-- ============================================================================
-- PURPOSE: Stores service locations for bookings.
--   Each booking references one address. Multiple bookings can share an address.
--
-- OWNERSHIP:
--   customer_id → customers (always set — the only path used in v3)
--   user_id     → profiles  (legacy column, always NULL in the current flow,
--                            kept for backward compatibility but never written)
--
-- The CHECK constraint ensures customer_id OR user_id is always set.
-- In practice, all new addresses have customer_id set and user_id = NULL.
--
-- OFFICE USE: square_meters and number_of_rooms are repurposed for office
--   square meters and estimated room count. The schema is shared to avoid
--   a separate office_addresses table at MVP.
-- ============================================================================

CREATE TABLE addresses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Legacy column — always NULL in the current flow. Do not write to this.
    -- Kept for backward compatibility. Will be dropped in a future migration.
    user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Always populated for bookings (the only path used in v3).
    customer_id         UUID REFERENCES customers(id) ON DELETE CASCADE,

    street_address      TEXT NOT NULL,
    apartment_number    TEXT,
    city                TEXT NOT NULL,
    postal_code         TEXT NOT NULL,
    square_meters       INTEGER NOT NULL,
    number_of_rooms     INTEGER NOT NULL,
    access_instructions TEXT,
    is_default          BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT addresses_owner_check CHECK (
        customer_id IS NOT NULL OR user_id IS NOT NULL
    )
);

CREATE INDEX idx_addresses_user_id     ON addresses(user_id);
CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);

CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Legacy policy for user_id path (kept for backward compat, effectively unused)
CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

-- Primary policy — used by the dashboard for authenticated customers
CREATE POLICY "Customer can view own addresses"
    ON addresses FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all addresses"
    ON addresses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 4. SERVICES TABLE
-- ============================================================================
-- PURPOSE: The service catalog — what types of cleaning you offer.
--   Each booking references one service by UUID.
--   service_type on bookings is a denormalized snapshot for historical accuracy.
--
-- OFFICE PRICING NOTE:
--   Office Cleaning has base_price = 0 because it is priced dynamically:
--   weekly_hours × hourly_rate × 4.2 weeks/month = monthly_estimate
--   The base_price column is irrelevant for office — the actual charge is
--   stored in bookings.monthly_estimate and bookings.final_price.
-- ============================================================================

CREATE TABLE services (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL UNIQUE,
    name_en        TEXT,
    description    TEXT,
    slug           TEXT UNIQUE,
    base_price     DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    duration_hours DECIMAL(4,2)  NOT NULL CHECK (duration_hours > 0),
    is_active      BOOLEAN DEFAULT true,
    display_order  INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO services (name, name_en, slug, description, base_price, duration_hours, display_order) VALUES
('Maintenance Cleaning', 'Maintenance Cleaning', 'maintenance', 'Regular home cleaning — kitchen, bathroom, living areas',      80.00,  2.5, 1),
('Deep Cleaning',        'Deep Cleaning',        'deep',        'Thorough top-to-bottom cleaning including hard-to-reach areas', 150.00, 4.0, 2),
('Move-Out Cleaning',    'Move-Out Cleaning',    'moveout',     'Inspection-ready clean meeting Finnish landlord requirements',  158.00, 4.0, 3),
('Office Cleaning',      'Office Cleaning',      'office',      'Recurring office cleaning — priced per hour, scheduled weekly',  0.00,  1.0, 4);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services"
    ON services FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage services"
    ON services FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 5. SUBSCRIPTION_PLANS TABLE
-- ============================================================================
-- PURPOSE: Defines the three residential subscription tiers.
--   Used only by residential bookings.
--   Office contracts use their own pricing model (weekly_hours × hourly_rate).
--
-- CRITICAL BILLING MODEL:
--   ALL plans bill ONCE per month in Stripe regardless of visit frequency.
--   "Weekly" = 4 visits/month billed as one monthly charge.
--   "Bi-weekly" = 2 visits/month billed as one monthly charge.
--   "Monthly" = 1 visit/month billed as one monthly charge.
--   stripe_billing_interval is constrained to 'month' — do NOT change to 'week'.
-- ============================================================================

CREATE TABLE subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    frequency           TEXT NOT NULL UNIQUE CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    description         TEXT,
    is_active           BOOLEAN DEFAULT true,
    visits_per_month    INTEGER NOT NULL DEFAULT 1 CHECK (visits_per_month IN (1, 2, 4)),
    stripe_billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (stripe_billing_interval = 'month'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, frequency, discount_percentage, description, visits_per_month) VALUES
('Weekly Plan',    'weekly',   15.00, 'Save 15% — 4 cleaning visits per month, billed monthly', 4),
('Bi-Weekly Plan', 'biweekly', 10.00, 'Save 10% — 2 cleaning visits per month, billed monthly', 2),
('Monthly Plan',   'monthly',   5.00, 'Save 5%  — 1 cleaning visit per month, billed monthly',  1);


-- ============================================================================
-- 6. BOOKINGS TABLE
-- ============================================================================
-- PURPOSE: The central transaction record. One row per booking agreement.
--   Unified for both residential and office bookings.
--
-- FREQUENCY VALUES:
--   Residential subscriptions: 'weekly' | 'biweekly' | 'monthly'
--   Deep cleaning:             'deepMonthly' | 'deepQuarterly' | 'deepOnetime'
--   One-time / move-out:       'one-time'
--   Office:                    'weekly' (always weekly recurring)
--
-- SERVICE TYPE VALUES:
--   'maintenance' | 'deep' | 'moveout' | 'office'
--
-- OFFICE-SPECIFIC STRIPE FIELDS:
--   estimated_hours     — weekly hours input, used for Stripe amount calculation
--   hourly_rate_cents   — tier rate in cents (4900 = €49/h), snapshotted at booking
--   quoted_amount_cents — GENERATED: estimated_hours × hourly_rate_cents (weekly cost)
--                         NOTE: this is the WEEKLY cost, not monthly.
--                         Use monthly_estimate for the Stripe billing amount.
--   stripe_product_id   — the Stripe Product used (prod_xxx for office cleaning)
--   monthly_estimate    — the actual Stripe billing amount (finalMonthly from pricing engine)
--                         = weeklyCost × WEEKS_PER_MONTH + surcharge
--                         Does NOT include addons (those are a separate Stripe line item)
-- ============================================================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Relationships ────────────────────────────────────────────────────────
    customer_id          UUID NOT NULL REFERENCES customers(id)           ON DELETE RESTRICT,
    service_id           UUID NOT NULL REFERENCES services(id)            ON DELETE RESTRICT,
    address_id           UUID NOT NULL REFERENCES addresses(id)           ON DELETE RESTRICT,
    subscription_plan_id UUID          REFERENCES subscription_plans(id),

    -- ── Scheduling ───────────────────────────────────────────────────────────
    booking_date DATE NOT NULL,
    time_slot    TIME NOT NULL,

    -- ── Status ───────────────────────────────────────────────────────────────
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'completed', 'cancelled')
    ),

    -- ── Frequency ────────────────────────────────────────────────────────────
    frequency TEXT NOT NULL DEFAULT 'one-time' CHECK (
        frequency IN (
            'one-time', 'weekly', 'biweekly', 'monthly',
            'deepMonthly', 'deepQuarterly', 'deepOnetime'
        )
    ),

    -- ── Pricing ──────────────────────────────────────────────────────────────
    final_price DECIMAL(10,2) NOT NULL,  -- plan + addons (display/reporting)
    base_price  DECIMAL(10,2),

    -- ── Stripe identifiers ────────────────────────────────────────────────────
    stripe_checkout_session_id TEXT UNIQUE,   -- cs_xxx — links webhook to booking
    stripe_payment_intent_id   TEXT,          -- pi_xxx — latest payment attempt
    stripe_subscription_id     TEXT,          -- sub_xxx — NULL for one-time
    stripe_price_id            TEXT,          -- price_xxx — residential only
    stripe_product_id          TEXT,          -- prod_xxx — office only

    -- ── Payment status ────────────────────────────────────────────────────────
    payment_status TEXT DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refunded')
    ),

    -- ── Subscription lifecycle ────────────────────────────────────────────────
    subscription_status TEXT CHECK (
        subscription_status IN (
            'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete'
        )
    ),
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at          TIMESTAMPTZ,

    -- ── Service snapshot ──────────────────────────────────────────────────────
    service_type  TEXT CHECK (service_type IN ('maintenance', 'deep', 'moveout', 'office')),
    plan_key      TEXT,
    plan_label    TEXT,
    show_deducted BOOLEAN DEFAULT false,

    -- ── Visit scheduling ──────────────────────────────────────────────────────
    visits_per_month INTEGER CHECK (visits_per_month IN (1, 2, 4)),

    -- ── Apartment snapshot (residential only, NULL for office) ────────────────
    apartment_key   TEXT,
    apartment_label TEXT,
    apartment_size  TEXT,

    -- ── Addons snapshot ───────────────────────────────────────────────────────
    -- Shape: { "count": 2, "rawTotal": 80, "discount": 8,
    --          "discountedTotal": 72, "names": ["Oven cleaning", "Sauna cleaning"] }
    -- addons_snapshot.discountedTotal is used as a SEPARATE Stripe line item.
    -- It is NOT included in monthly_estimate (office) or the plan Price (residential).
    addons_snapshot JSONB DEFAULT '{}',

    -- ── Notes ────────────────────────────────────────────────────────────────
    special_notes TEXT,

    -- ── Office-specific columns (NULL when service_type != 'office') ──────────
    office_name               TEXT,
    office_size_sqm           INTEGER,
    weekly_hours              DECIMAL(5,2),
    hourly_rate               DECIMAL(10,2),
    recurring_time            TIME,
    evening_weekend_surcharge BOOLEAN DEFAULT false,

    -- The Stripe billing amount for office (plan only, no addons).
    -- = serverPricing.finalMonthly = weeklyCost × 4.2 + surcharge
    -- Addons are a separate line item. final_price = monthly_estimate + addons.
    monthly_estimate DECIMAL(10,2),

    -- ── Office Stripe pricing fields (v3) ─────────────────────────────────────
    -- estimated_hours and hourly_rate_cents drive the Stripe price_data amount.
    -- quoted_amount_cents is a computed field for analytics — NOT the billing amount.
    -- For billing: use monthly_estimate (true monthly = weeks × hours × rate).
    estimated_hours     NUMERIC(4,1),
    hourly_rate_cents   INTEGER,
    -- WEEKLY cost = estimated_hours × hourly_rate_cents. NOT used for billing.
    -- monthly_estimate is the billing amount.
    quoted_amount_cents INTEGER GENERATED ALWAYS AS (
        ROUND(estimated_hours * hourly_rate_cents)
    ) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id             ON bookings(customer_id);
CREATE INDEX idx_bookings_date                    ON bookings(booking_date);
CREATE INDEX idx_bookings_status                  ON bookings(status);
CREATE INDEX idx_bookings_service_type            ON bookings(service_type);
CREATE INDEX idx_bookings_stripe_checkout_session ON bookings(stripe_checkout_session_id);
CREATE INDEX idx_bookings_stripe_subscription_id  ON bookings(stripe_subscription_id);
CREATE INDEX idx_bookings_office_rate             ON bookings(hourly_rate_cents)
    WHERE service_type = 'office';

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own bookings"
    ON bookings FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Customer can cancel own bookings"
    ON bookings FOR UPDATE
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Admins can manage all bookings"
    ON bookings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 7. OFFICE_SCHEDULE_RULES TABLE
-- ============================================================================
-- PURPOSE: Recurring weekly cleaning pattern for office contracts.
--   e.g. Mon 2h + Wed 4h + Fri 4h = 10h/week → 3 rows per booking.
-- ============================================================================

CREATE TABLE office_schedule_rules (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    day_of_week    INTEGER      NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time     TIME         NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL CHECK (duration_hours > 0),
    is_active      BOOLEAN      DEFAULT true,
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT uq_booking_day UNIQUE (booking_id, day_of_week)
);

CREATE INDEX idx_office_schedule_booking_id ON office_schedule_rules(booking_id);
CREATE INDEX idx_office_schedule_day        ON office_schedule_rules(day_of_week);

CREATE TRIGGER update_office_schedule_rules_updated_at
    BEFORE UPDATE ON office_schedule_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE office_schedule_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own office schedule"
    ON office_schedule_rules FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            WHERE c.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all office schedules"
    ON office_schedule_rules FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 8. BOOKING_EXTRAS TABLE
-- ============================================================================
-- PURPOSE: Normalised add-on services per residential booking.
--   The addons_snapshot JSONB on bookings handles display.
--   This table enables analytics: "how many oven cleans in Q2?"
-- ============================================================================

CREATE TABLE booking_extras (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    extra_type TEXT NOT NULL CHECK (
        extra_type IN (
            'windows', 'oven', 'oven_interior', 'fridge', 'deep_clean',
            'high_dust', 'trash_cabinet', 'sauna', 'ironing', 'laundry'
        )
    ),
    price      DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_extras_booking_id ON booking_extras(booking_id);

ALTER TABLE booking_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own booking extras"
    ON booking_extras FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            WHERE c.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage booking extras"
    ON booking_extras FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 9. PAYMENTS TABLE
-- ============================================================================
-- PURPOSE: One row per Stripe invoice or charge — complete payment history.
--
-- HOW IT WORKS WITH STRIPE WEBHOOKS:
--   invoice.paid           → INSERT row (status='succeeded', paid_at=NOW())
--   invoice.payment_failed → INSERT row (status='failed', failure_message=...)
--   charge.refunded        → UPDATE row (status='refunded', stripe_refund_id=...)
--
-- AMOUNT: stored in cents (€89.00 = 8900). Avoids floating-point errors.
--
-- DOUBLE-COUNTING PREVENTION:
--   For subscriptions, invoice.paid fires on subscription_create AND every
--   renewal. The is_first_payment flag identifies the first invoice.
--   checkout.session.completed only creates a payments row for one-time bookings.
--   For subscriptions, the payments row is created by invoice.paid.
-- ============================================================================

CREATE TABLE payments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,

    stripe_payment_intent_id TEXT UNIQUE,  -- pi_xxx
    stripe_invoice_id        TEXT UNIQUE,  -- in_xxx
    stripe_refund_id         TEXT,         -- re_xxx (set when refunded)

    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency     TEXT    NOT NULL DEFAULT 'eur',

    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')
    ),
    failure_message TEXT,

    billing_period_start TIMESTAMPTZ,
    billing_period_end   TIMESTAMPTZ,
    visits_covered       INTEGER,
    is_first_payment     BOOLEAN     DEFAULT false,
    paid_at              TIMESTAMPTZ,
    refunded_at          TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id               ON payments(booking_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_invoice_id        ON payments(stripe_invoice_id);
CREATE INDEX idx_payments_status                   ON payments(status);
CREATE INDEX idx_payments_paid_at                  ON payments(paid_at);

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own payments"
    ON payments FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            WHERE c.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all payments"
    ON payments FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 10. STRIPE_WEBHOOK_EVENTS TABLE
-- ============================================================================
-- PURPOSE: Idempotency log — prevents duplicate processing on Stripe retries.
--
-- HOW IDEMPOTENCY WORKS:
--   1. Event arrives (evt_xxx)
--   2. INSERT into this table — if duplicate, unique constraint throws 23505
--   3. Handler catches 23505 → returns 200 immediately, does nothing
--   4. If INSERT succeeds → process event → set processed = true
--
-- Stripe retries for up to 72 hours. Without this table, duplicate invoices
-- and emails would occur on every retry.
-- ============================================================================

CREATE TABLE stripe_webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE,  -- evt_xxx — the idempotency key
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,        -- full raw event — never truncate
    processed       BOOLEAN DEFAULT false,
    processing_error TEXT,
    related_booking_id UUID REFERENCES bookings(id),
    received_at     TIMESTAMPTZ DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_webhook_events_stripe_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_event_type      ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed       ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_related_booking ON stripe_webhook_events(related_booking_id);

-- No RLS — service role key only. Never expose to client.


-- ============================================================================
-- 11. CUSTOMER_PAYMENT_METHODS TABLE
-- ============================================================================
-- PURPOSE: Saved Stripe payment methods for authenticated customers.
--   Guest customers cannot save payment methods — requires auth_user_id.
-- ============================================================================

CREATE TABLE customer_payment_methods (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id              UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id       TEXT NOT NULL,
    card_brand               TEXT,
    card_last4               TEXT,
    card_exp_month           INTEGER,
    card_exp_year            INTEGER,
    is_default               BOOLEAN DEFAULT false,
    created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_customer ON customer_payment_methods(customer_id);

ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own payment methods"
    ON customer_payment_methods FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all payment methods"
    ON customer_payment_methods FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 12. QUOTE_REQUESTS TABLE
-- ============================================================================

CREATE TABLE quote_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT,
    address       TEXT NOT NULL,
    square_meters INTEGER,
    rooms         INTEGER,
    frequency     TEXT CHECK (frequency IN ('one-time', 'weekly', 'biweekly', 'monthly')),
    extras        JSONB DEFAULT '[]',
    message       TEXT,
    status        TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'contacted', 'converted', 'rejected')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_requests_status  ON quote_requests(status);
CREATE INDEX idx_quote_requests_created ON quote_requests(created_at);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quote requests"
    ON quote_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all quote requests"
    ON quote_requests FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 13. AVAILABILITY_SLOTS TABLE
-- ============================================================================

CREATE TABLE availability_slots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    max_bookings INTEGER DEFAULT 1 CHECK (max_bookings > 0),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO availability_slots (day_of_week, start_time, end_time, is_available, max_bookings) VALUES
(1, '08:00', '11:00', true, 1), (1, '11:00', '14:00', true, 1), (1, '14:00', '17:00', true, 1),
(2, '08:00', '11:00', true, 1), (2, '11:00', '14:00', true, 1), (2, '14:00', '17:00', true, 1),
(3, '08:00', '11:00', true, 1), (3, '11:00', '14:00', true, 1), (3, '14:00', '17:00', true, 1),
(4, '08:00', '11:00', true, 1), (4, '11:00', '14:00', true, 1), (4, '14:00', '17:00', true, 1),
(5, '08:00', '11:00', true, 1), (5, '11:00', '14:00', true, 1), (5, '14:00', '17:00', true, 1);


-- ============================================================================
-- 14. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_slot_availability(
    p_booking_date DATE,
    p_time_slot    TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week      INTEGER;
    v_max_bookings     INTEGER;
    v_current_bookings INTEGER;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_booking_date);
    SELECT max_bookings INTO v_max_bookings
    FROM availability_slots
    WHERE day_of_week = v_day_of_week
      AND p_time_slot >= start_time
      AND p_time_slot < end_time
      AND is_available = true;
    IF v_max_bookings IS NULL THEN RETURN false; END IF;
    SELECT COUNT(*) INTO v_current_bookings
    FROM bookings
    WHERE booking_date = p_booking_date
      AND time_slot    = p_time_slot
      AND status NOT IN ('cancelled');
    RETURN v_current_bookings < v_max_bookings;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE (time_slot TIME, is_available BOOLEAN) AS $$
DECLARE v_day_of_week INTEGER;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    RETURN QUERY
    SELECT a.start_time, check_slot_availability(p_date, a.start_time)
    FROM availability_slots a
    WHERE a.day_of_week = v_day_of_week AND a.is_available = true
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 15. AUTH UPGRADE FUNCTIONS (v3)
-- ============================================================================
-- These functions implement the guest-to-authenticated customer linking.
--
-- FLOW:
--   Customer authenticates via magic link
--   → Supabase creates auth.users row
--   → on_auth_user_created trigger fires
--   → handle_new_auth_user() calls link_customer_to_auth()
--   → customers.auth_user_id is set
--   → customers.onboarding_completed_at is set
--   → Dashboard RLS policies now work for this customer
--
-- IDEMPOTENCY:
--   link_customer_to_auth() uses WHERE auth_user_id IS NULL.
--   Running it twice for the same customer is a safe no-op.
--
-- EMAIL MATCHING:
--   Uses LOWER(TRIM()) on both sides — prevents case mismatch between
--   booking email ("Jane@gmail.com") and auth email ("jane@gmail.com").
--
-- FAULT TOLERANCE:
--   handle_new_auth_user() wraps the link call in EXCEPTION.
--   A linking failure NEVER blocks auth.users INSERT.
--   The customer can still authenticate — just without the link.
--   The admin can manually run link_customer_to_auth() to fix it.
--
-- MANUAL LINKING (if trigger missed a customer):
--   SELECT link_customer_to_auth('customer@email.com',
--     (SELECT id FROM auth.users WHERE email = 'customer@email.com'));
-- ============================================================================

CREATE OR REPLACE FUNCTION link_customer_to_auth(
    p_email        TEXT,
    p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Case-insensitive match — prevents linking failure due to email case mismatch
    SELECT id INTO v_customer_id
    FROM customers
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        -- No customer found for this email — first-time auth user, not a booker yet
        RETURN false;
    END IF;

    UPDATE customers
    SET
        auth_user_id            = p_auth_user_id,
        onboarding_completed_at = NOW(),
        updated_at              = NOW()
    WHERE id             = v_customer_id
      AND auth_user_id  IS NULL;  -- never overwrite an existing link

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Fault-tolerant: EXCEPTION block ensures a linking failure never
    -- rolls back the auth.users INSERT. The customer can still authenticate.
    BEGIN
        PERFORM link_customer_to_auth(NEW.email, NEW.id);
        RAISE NOTICE '[handle_new_auth_user] Processed: %', NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_new_auth_user] Failed for %: %', NEW.email, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate to ensure correct definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ============================================================================
-- 16. ADMIN VIEWS
-- ============================================================================

CREATE VIEW v_admin_upcoming_bookings AS
SELECT
    b.id, b.booking_date, b.time_slot, b.status, b.payment_status,
    b.subscription_status, b.visits_per_month,
    b.current_period_end AS next_billing_date, b.cancel_at_period_end,
    c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
    s.name AS service_name, b.service_type, b.plan_label, b.frequency,
    b.final_price, b.apartment_size,
    a.street_address || ', ' || a.city AS address,
    b.addons_snapshot, b.special_notes,
    (c.auth_user_id IS NOT NULL) AS is_authenticated
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services  s ON b.service_id  = s.id
JOIN addresses a ON b.address_id  = a.id
WHERE b.booking_date >= CURRENT_DATE
  AND (b.service_type IS NULL OR b.service_type != 'office')
ORDER BY b.booking_date, b.time_slot;

CREATE VIEW v_office_bookings AS
SELECT
    b.id, b.booking_date AS contract_start_date,
    b.status, b.payment_status, b.subscription_status, b.frequency,
    b.office_name, b.office_size_sqm, b.weekly_hours, b.hourly_rate,
    b.monthly_estimate, b.evening_weekend_surcharge,
    b.current_period_end AS next_billing_date, b.cancel_at_period_end,
    c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
    (c.auth_user_id IS NOT NULL) AS is_authenticated,
    s.name AS service_name, a.street_address || ', ' || a.city AS address,
    (
        SELECT json_agg(
            json_build_object('day', osr.day_of_week, 'start', osr.start_time, 'duration', osr.duration_hours)
            ORDER BY osr.day_of_week
        )
        FROM office_schedule_rules osr
        WHERE osr.booking_id = b.id AND osr.is_active = true
    ) AS schedule_rules,
    b.special_notes, b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services  s ON b.service_id  = s.id
JOIN addresses a ON b.address_id  = a.id
WHERE b.service_type = 'office'
ORDER BY b.created_at DESC;

CREATE VIEW v_subscription_health AS
SELECT
    b.id AS booking_id,
    c.full_name AS customer_name, c.email AS customer_email,
    b.service_type, b.plan_label, b.frequency, b.visits_per_month,
    b.subscription_status, b.payment_status,
    b.current_period_start, b.current_period_end AS next_billing_date,
    b.cancel_at_period_end, b.canceled_at,
    COUNT(p.id) AS total_invoices,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) / 100.0 AS total_collected_eur,
    SUM(CASE WHEN p.status = 'failed'    THEN 1              ELSE 0 END)          AS failed_payment_count,
    MAX(CASE WHEN p.status = 'succeeded' THEN p.paid_at END)                      AS last_successful_payment,
    b.stripe_subscription_id, b.stripe_price_id
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE b.frequency != 'one-time'
GROUP BY
    b.id, c.full_name, c.email, b.service_type, b.plan_label, b.frequency,
    b.visits_per_month, b.subscription_status, b.payment_status,
    b.current_period_start, b.current_period_end,
    b.cancel_at_period_end, b.canceled_at,
    b.stripe_subscription_id, b.stripe_price_id
ORDER BY b.created_at DESC;

CREATE VIEW v_customer_list AS
SELECT
    c.id, c.full_name, c.email, c.phone,
    (c.auth_user_id IS NOT NULL)       AS has_account,
    c.onboarding_completed_at          AS account_created_at,
    (c.stripe_customer_id IS NOT NULL) AS has_stripe_customer,
    COUNT(DISTINCT b.id)               AS total_bookings,
    MAX(b.booking_date)                AS last_booking_date,
    SUM(b.final_price)                 AS total_billed,
    COALESCE(SUM(p_agg.collected) / 100.0, 0) AS total_collected_eur,
    CASE
        WHEN COUNT(b.id) FILTER (WHERE b.frequency != 'one-time') > 0 THEN 'Subscriber'
        ELSE 'One-time'
    END AS customer_type,
    c.created_at AS joined_date
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN LATERAL (
    SELECT SUM(amount_cents) AS collected
    FROM payments
    WHERE booking_id = b.id AND status = 'succeeded'
) p_agg ON true
GROUP BY c.id, c.full_name, c.email, c.phone, c.auth_user_id,
         c.onboarding_completed_at, c.stripe_customer_id, c.created_at
ORDER BY c.created_at DESC;

CREATE VIEW v_failed_webhook_events AS
SELECT stripe_event_id, event_type, processing_error,
       related_booking_id, received_at, processed_at
FROM stripe_webhook_events
WHERE processed = false OR processing_error IS NOT NULL
ORDER BY received_at DESC;


-- ============================================================================
-- MIGRATION CHECKLIST (apply to existing DB, do not re-run on fresh installs)
-- ============================================================================
-- Run these if upgrading from v1/v2:
--
-- -- Normalise existing emails
-- UPDATE customers SET email = LOWER(TRIM(email));
-- ALTER TABLE customers ADD CONSTRAINT customers_email_lowercase
--   CHECK (email = LOWER(TRIM(email)));
--
-- -- Add v3 columns
-- ALTER TABLE customers
--   ADD COLUMN IF NOT EXISTS magic_link_sent_at      TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
--
-- -- Fix booking_extras constraint (add oven_interior, trash_cabinet)
-- ALTER TABLE booking_extras DROP CONSTRAINT booking_extras_extra_type_check;
-- ALTER TABLE booking_extras ADD CONSTRAINT booking_extras_extra_type_check
--   CHECK (extra_type IN (
--     'windows','oven','oven_interior','fridge','deep_clean',
--     'high_dust','trash_cabinet','sauna','ironing','laundry'
--   ));
--
-- -- Fix bookings frequency constraint (add deep variants)
-- ALTER TABLE bookings DROP CONSTRAINT bookings_frequency_check;
-- ALTER TABLE bookings ADD CONSTRAINT bookings_frequency_check
--   CHECK (frequency IN (
--     'one-time','weekly','biweekly','monthly',
--     'deepMonthly','deepQuarterly','deepOnetime'
--   ));
--
-- -- Add office Stripe columns
-- ALTER TABLE bookings
--   ADD COLUMN IF NOT EXISTS estimated_hours     NUMERIC(4,1),
--   ADD COLUMN IF NOT EXISTS hourly_rate_cents   INTEGER,
--   ADD COLUMN IF NOT EXISTS quoted_amount_cents INTEGER
--     GENERATED ALWAYS AS (ROUND(estimated_hours * hourly_rate_cents)) STORED,
--   ADD COLUMN IF NOT EXISTS stripe_product_id   TEXT;
--
-- -- Make profiles.full_name nullable (customers should never be in profiles)
-- ALTER TABLE profiles ALTER COLUMN full_name DROP NOT NULL;
--
-- -- Recreate trigger with fault-tolerant exception handler
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
--
-- ============================================================================
-- WEBHOOKS TO SUBSCRIBE IN STRIPE DASHBOARD
-- ============================================================================
-- checkout.session.completed    → confirm booking, set subscription_id
-- invoice.paid                  → record payment, update billing period
-- invoice.payment_failed        → record failure, set past_due, send email
-- customer.subscription.updated → sync subscription_status, cancel_at_period_end
-- customer.subscription.deleted → set canceled, record canceled_at
-- charge.refunded               → update payments row with refund data
-- checkout.session.expired      → optional: notify customer, clean pending booking
--
-- ============================================================================
-- END OF SCHEMA v3
-- ============================================================================