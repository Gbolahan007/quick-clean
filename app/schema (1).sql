-- ============================================================================
-- CLEANING SERVICE PLATFORM — COMPLETE SCHEMA
-- QuickClean | Tampere, Finland
-- ============================================================================
--
-- VERSION HISTORY
--   v1  — Phase 1 MVP: residential + office bookings, guest-first auth
--   v2  — Stripe payment integration: monthly billing, subscriptions,
--          idempotent webhooks, full payment history
--
-- TABLE INVENTORY (14 tables + 2 new + admin views)
-- ─────────────────────────────────────────────────────────────────────────────
--   Core identity
--     profiles                  — authenticated admin/user records
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
--   Only exists for users who have completed Supabase Auth sign-up.
--   Guest customers who book without an account do NOT appear here —
--   they exist only in the customers table.
--
-- KEY RELATIONSHIPS:
--   profiles.id → auth.users.id (1:1, cascade delete)
--   addresses.user_id → profiles.id (optional, legacy path)
--
-- WHY SEPARATE FROM customers:
--   Keeps auth concerns (roles, permissions) separate from booking concerns
--   (guest identity, booking history). Guests can book without ever touching
--   this table. Admins always have a profiles row.
-- ============================================================================

CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name  TEXT NOT NULL,
    phone      TEXT,
    role       TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
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
-- AUTH UPGRADE: Customer later signs up → handle_new_auth_user trigger
--   automatically links auth.users.id into customers.auth_user_id
--   All booking history is preserved. No data loss, no duplicate rows.
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

    -- Identity anchor for the guest booking flow.
    -- UNIQUE because email is how we deduplicate returning guests.
    email        TEXT NOT NULL UNIQUE,
    full_name    TEXT NOT NULL,
    phone        TEXT,

    -- Nullable: NULL until the customer optionally creates a Supabase account.
    -- Populated automatically by handle_new_auth_user trigger (section 13).
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- ── Stripe (v2) ──────────────────────────────────────────────────────────
    -- The Stripe Customer ID (cus_xxx) for this person.
    -- Set during the first Checkout Session creation via your server action.
    -- Reused for all subsequent bookings — never create two Stripe Customers
    -- for the same email address.
    -- UNIQUE: one Stripe Customer per platform customer.
    stripe_customer_id TEXT UNIQUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email              ON customers(email);
CREATE INDEX idx_customers_auth_user_id       ON customers(auth_user_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);

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
-- PURPOSE: Stores service locations for both guests and authenticated users.
--   Each booking references one address. Multiple bookings can share an address
--   (e.g. the same apartment booked weekly for 6 months).
--
-- TWO OWNERSHIP PATHS:
--   customer_id → customers (primary, always set for guest bookings)
--   user_id     → profiles  (legacy, set only for fully authenticated users)
--   The CHECK constraint ensures at least one is populated.
--
-- WHY ADDRESSES ARE SEPARATE FROM BOOKINGS:
--   A customer may have multiple properties. An address can be reused across
--   many bookings. Normalizing avoids address data duplication and enables
--   address-level analytics (e.g. all visits to this building).
--
-- OFFICE USE: office_size_sqm and number_of_rooms are repurposed for office
--   square meters and estimated room count. The schema is shared to avoid
--   a separate office_addresses table at MVP.
-- ============================================================================

CREATE TABLE addresses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Populated only for fully authenticated post-onboarding users (legacy path)
    user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
    -- Always populated for guest flow bookings (primary path)
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

CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

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
--   Each booking references one service. Services rarely change but their
--   IDs are snapshot into bookings.service_type for historical accuracy.
--
-- OFFICE PRICING NOTE:
--   Office Cleaning has base_price = 0 because it is priced dynamically:
--   weekly_hours × hourly_rate × 4.33 weeks/month = monthly_estimate
--   The base_price column is irrelevant for office — the actual charge is
--   stored in bookings.monthly_estimate and bookings.final_price.
--
-- WHY duration_hours EXISTS:
--   Used for scheduling — knowing how long a visit takes lets the system
--   prevent double-booking of cleaners on the same day.
-- ============================================================================

CREATE TABLE services (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL UNIQUE,
    description    TEXT,
    base_price     DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    duration_hours DECIMAL(4,2)  NOT NULL CHECK (duration_hours > 0),
    is_active      BOOLEAN DEFAULT true,
    display_order  INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO services (name, description, base_price, duration_hours, display_order) VALUES
('Maintenance Cleaning', 'Regular home cleaning — kitchen, bathroom, living areas',      80.00,  2.5, 1),
('Deep Cleaning',        'Thorough top-to-bottom cleaning including hard-to-reach areas', 150.00, 4.0, 2),
('Move-Out Cleaning',    'Inspection-ready clean meeting Finnish landlord requirements',  158.00, 4.0, 3),
('Office Cleaning',      'Recurring office cleaning — priced per hour, scheduled weekly',  0.00,  1.0, 4);


-- ============================================================================
-- 5. SUBSCRIPTION_PLANS TABLE
-- ============================================================================
-- PURPOSE: Defines the three residential subscription tiers and links each
--   to its Stripe Price object. Used only by residential bookings.
--   Office contracts use their own pricing model (weekly_hours × hourly_rate).
--
-- CRITICAL BILLING MODEL:
--   ALL plans bill ONCE per month in Stripe regardless of visit frequency.
--   "Weekly" means 4 visits per month, billed as one monthly charge.
--   "Bi-weekly" means 2 visits per month, billed as one monthly charge.
--   "Monthly" means 1 visit per month, billed as one monthly charge.
--   stripe_billing_interval is constrained to 'month' to enforce this — it
--   is NOT 'week' for the weekly plan. Stripe only knows the monthly amount.
--
-- visits_per_month:
--   This is YOUR platform's scheduling data — Stripe never sees it.
--   When invoice.paid fires, your code uses booking.visits_per_month to
--   generate the correct number of visit slots for that billing period.
--
-- stripe_price_id (per-plan default):
--   Each plan has a default Stripe Price for reference. However, because
--   the actual charge amount varies by apartment type, the authoritative
--   price snapshot is stored on bookings.stripe_price_id — not here.
--   This column is useful for plan-level admin visibility.
--
-- discount_percentage:
--   Applied to the per-visit price at booking time. The discounted total
--   is what becomes the monthly charge in Stripe. This discount is baked
--   into the Stripe Price amount — Stripe does not apply discounts itself.
-- ============================================================================

CREATE TABLE subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    frequency           TEXT NOT NULL UNIQUE CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    description         TEXT,
    is_active           BOOLEAN DEFAULT true,

    -- ── Stripe (v2) ──────────────────────────────────────────────────────────
    -- How many cleaning visits are included per month for this plan.
    -- 4 = weekly plan (4 visits/month)
    -- 2 = bi-weekly plan (2 visits/month)
    -- 1 = monthly plan (1 visit/month)
    -- Your scheduling system reads this to generate visit slots after invoice.paid.
    visits_per_month INTEGER NOT NULL DEFAULT 1
        CHECK (visits_per_month IN (1, 2, 4)),

    -- Always 'month'. Constrained to document that ALL plans bill monthly.
    -- Do not change to 'week' — Stripe Prices for all plans use interval=month.
    stripe_billing_interval TEXT NOT NULL DEFAULT 'month'
        CHECK (stripe_billing_interval = 'month'),

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
--   Unified for both residential and office bookings — office-specific columns
--   are nullable and only populated when service_type = 'office'.
--
-- SNAPSHOT COLUMNS (apartment_key, apartment_label, apartment_size, addons_snapshot,
--   plan_key, plan_label, stripe_price_id, visits_per_month):
--   Prices and service definitions change over time. Snapshots capture exactly
--   what the customer agreed to and paid for at booking time. This ensures
--   historical receipts are accurate even after price updates.
--
-- STRIPE COLUMNS EXPLAINED:
--
--   stripe_checkout_session_id (cs_xxx) — MOST CRITICAL
--     Set by your server action immediately after stripe.checkout.sessions.create().
--     Used by the checkout.session.completed webhook to identify which booking
--     was just paid. Without this, the webhook cannot find the booking to confirm.
--
--   stripe_payment_intent_id (pi_xxx)
--     For one-time: set by checkout.session.completed (session.payment_intent).
--     For subscriptions: updated by invoice.paid for the most recent invoice.
--     Also lives on the payments table per-invoice for full history.
--
--   stripe_subscription_id (sub_xxx)
--     Set by checkout.session.completed (session.subscription).
--     NULL for one-time bookings.
--     Used as the lookup key for all subsequent subscription webhook events.
--
--   stripe_price_id (price_xxx)
--     Snapshot of which Stripe Price object was used. Set at Checkout creation.
--     For subscriptions: a monthly recurring Price (interval=month).
--     For one-time: a one_time Price.
--     Needed because Prices can be archived; this preserves the billing reference.
--
--   subscription_status
--     Tracks the Stripe subscription lifecycle — NOT the payment outcome.
--     payment_status = "did money move?" (pending/paid/failed/refunded)
--     subscription_status = "is the subscription alive?" (active/past_due/canceled)
--     These answer different questions and must be separate columns.
--     Updated by: customer.subscription.updated and customer.subscription.deleted.
--
--   current_period_start / current_period_end
--     The current Stripe billing window. Updated monthly by invoice.paid.
--     Used to display "your next billing date is X" to customers.
--     Also used to determine whether a past_due subscription still has valid access.
--
--   cancel_at_period_end
--     True when a customer has cancelled but their paid period hasn't expired.
--     When this is true, no new invoice will be generated but the subscription
--     remains active until current_period_end. UI shows "cancels on [date]".
--     Set by customer.subscription.updated webhook.
--
--   canceled_at
--     Timestamp when the subscription actually ended (after cancel_at_period_end
--     period expires). Set by customer.subscription.deleted webhook.
--
--   visits_per_month (snapshot)
--     Copied from subscription_plans.visits_per_month at booking time.
--     Your scheduling system reads this to generate visit slots each month.
--     NULL for one-time bookings. Never sent to Stripe.
-- ============================================================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Relationships ────────────────────────────────────────────────────────
    customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    service_id           UUID NOT NULL REFERENCES services(id)  ON DELETE RESTRICT,
    address_id           UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    -- NULL for office bookings and one-time bookings
    subscription_plan_id UUID REFERENCES subscription_plans(id),

    -- ── Scheduling ───────────────────────────────────────────────────────────
    booking_date DATE NOT NULL,
    time_slot    TIME NOT NULL,

    -- ── Status ───────────────────────────────────────────────────────────────
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'completed', 'cancelled')
    ),

    -- ── Frequency ────────────────────────────────────────────────────────────
    frequency TEXT NOT NULL DEFAULT 'one-time' CHECK (
        frequency IN ('one-time', 'weekly', 'biweekly', 'monthly')
    ),

    -- ── Pricing ──────────────────────────────────────────────────────────────
    final_price DECIMAL(10,2) NOT NULL,
    base_price  DECIMAL(10,2),

    -- ── Payment — Stripe identifiers ─────────────────────────────────────────
    -- See column explanations in table header above.

    -- Set before Checkout redirect. Used by webhook to find this booking.
    stripe_checkout_session_id TEXT UNIQUE,

    -- Set by checkout.session.completed. For subscriptions: latest pi only.
    stripe_payment_intent_id   TEXT,

    -- Set by checkout.session.completed. NULL for one-time bookings.
    stripe_subscription_id     TEXT,

    -- Snapshot of the Stripe Price object used. Set at Checkout creation.
    stripe_price_id            TEXT,

    -- Payment outcome: did money move?
    payment_status TEXT DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refunded')
    ),

    -- Subscription lifecycle: is the subscription alive?
    -- NULL for one-time bookings.
    subscription_status TEXT CHECK (
        subscription_status IN (
            'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete'
        )
    ),

    -- Current Stripe billing window. Updated monthly by invoice.paid webhook.
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,

    -- True when customer cancelled but period hasn't expired yet.
    cancel_at_period_end BOOLEAN DEFAULT false,

    -- When the subscription actually ended. Set by customer.subscription.deleted.
    canceled_at TIMESTAMPTZ,

    -- ── Service snapshot (denormalized) ──────────────────────────────────────
    service_type  TEXT CHECK (service_type IN ('maintenance', 'deep', 'moveout', 'office')),
    plan_key      TEXT,
    plan_label    TEXT,
    show_deducted BOOLEAN DEFAULT false,

    -- ── Visit scheduling (v2) ─────────────────────────────────────────────────
    -- Snapshot of visits included per month. Copied from subscription_plans
    -- at booking time. Scheduling system reads this after each invoice.paid
    -- to generate the correct number of visit slots for the period.
    -- NULL for one-time bookings. NOT sent to Stripe.
    visits_per_month INTEGER CHECK (visits_per_month IN (1, 2, 4)),

    -- ── Apartment snapshot (denormalized) ────────────────────────────────────
    -- NULL for office bookings.
    apartment_key   TEXT,
    apartment_label TEXT,
    apartment_size  TEXT,

    -- ── Addons snapshot (JSONB) ───────────────────────────────────────────────
    -- Shape: { "count": 2, "rawTotal": 80, "discount": 8,
    --          "discountedTotal": 72, "names": ["Oven cleaning", "Sauna cleaning"] }
    -- NULL / '{}' for office bookings.
    addons_snapshot JSONB DEFAULT '{}',

    -- ── Notes ────────────────────────────────────────────────────────────────
    special_notes TEXT,

    -- ── Office-specific columns ───────────────────────────────────────────────
    -- All nullable — NULL when service_type != 'office'.
    office_name               TEXT,
    office_size_sqm           INTEGER,
    weekly_hours              DECIMAL(5,2),
    hourly_rate               DECIMAL(10,2),
    recurring_time            TIME,
    evening_weekend_surcharge BOOLEAN DEFAULT false,
    -- weekly_hours × hourly_rate × 4.33 — the Stripe subscription amount for office
    monthly_estimate          DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id             ON bookings(customer_id);
CREATE INDEX idx_bookings_date                    ON bookings(booking_date);
CREATE INDEX idx_bookings_status                  ON bookings(status);
CREATE INDEX idx_bookings_service_type            ON bookings(service_type);
CREATE INDEX idx_bookings_stripe_checkout_session ON bookings(stripe_checkout_session_id);
CREATE INDEX idx_bookings_stripe_subscription_id  ON bookings(stripe_subscription_id);

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
-- PURPOSE: Stores the recurring weekly cleaning pattern for office contracts.
--   An office contract is not a single date but a repeating pattern:
--   e.g. Mon 2h + Wed 4h + Fri 4h = 10 hrs/week.
--   Each pattern day gets one row. All rows link to one bookings row.
--
-- WHY NOT in bookings:
--   bookings.booking_date is a single DATE — correct for one-off residential
--   visits. A weekly pattern cannot fit in one DATE column. This table gives
--   each day of the pattern its own row with time and duration.
--
-- is_active: allows pausing a specific day (e.g. client temporarily drops
--   Wednesdays) without losing the schedule configuration.
--
-- UNIQUE(booking_id, day_of_week): prevents two Monday rules for the same
--   booking — each day of the week appears at most once per contract.
-- ============================================================================

CREATE TABLE office_schedule_rules (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
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

-- RLS
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 8. BOOKING_EXTRAS TABLE
-- ============================================================================
-- PURPOSE: Normalised record of add-on services per residential booking.
--   The addons_snapshot JSONB on bookings handles fast reads and receipt display.
--   This table enables analytics queries:
--     "How many oven cleans did we do in Q2?"
--     "Which add-ons are most popular with 3-room apartments?"
--   Not used for office bookings (no addons model at MVP).
--
-- WHY SEPARATE FROM addons_snapshot:
--   JSONB is great for storing and displaying a snapshot but poor for
--   aggregating across thousands of rows. This table is the analytics layer.
-- ============================================================================

CREATE TABLE booking_extras (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    extra_type TEXT NOT NULL CHECK (
        extra_type IN ('windows', 'oven', 'fridge', 'deep_clean', 'high_dust', 'sauna', 'ironing', 'laundry')
    ),
    price      DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_extras_booking_id ON booking_extras(booking_id);

ALTER TABLE booking_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage booking extras"
    ON booking_extras FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 9. PAYMENTS TABLE (NEW in v2)
-- ============================================================================
-- PURPOSE: One row per Stripe invoice or charge. This is the complete payment
--   history for every booking.
--
-- WHY NOT just use bookings.payment_status:
--   A monthly subscription generates one invoice per month — 12 per year.
--   A weekly subscriber for 1 year = 12 payment records.
--   bookings.payment_status can only hold the CURRENT state, not history.
--   This table records every invoice: when it was paid, what period it covered,
--   whether it failed, how many retries occurred, and whether it was refunded.
--
-- HOW IT WORKS WITH STRIPE WEBHOOKS:
--   invoice.paid              → INSERT row (status='succeeded', paid_at=NOW())
--   invoice.payment_failed    → INSERT row (status='failed', failure_message=...)
--   charge.refunded           → UPDATE row (status='refunded', stripe_refund_id=...)
--
-- amount_cents:
--   Stripe always uses the smallest currency unit. €89.00 = 8900 cents.
--   Storing in cents avoids floating-point arithmetic errors (e.g. 0.1 + 0.2 ≠ 0.3).
--   Display: amount_cents / 100.0
--
-- billing_period_start / billing_period_end:
--   Which calendar period this invoice covers.
--   For a weekly subscriber: "Jun 1 – Jul 1 = 4 visits included"
--   Comes from Stripe invoice.period_start and invoice.period_end.
--   Used to show customers "your June plan is paid".
--
-- visits_covered:
--   Snapshot of how many visits this payment entitles the customer to.
--   Redundant with bookings.visits_per_month but useful for per-invoice display:
--   "This invoice covers 4 visits (weekly plan, Jun 1 – Jul 1)"
--
-- is_first_payment:
--   True when invoice.billing_reason = 'subscription_create'.
--   Useful for welcome email triggers and conversion analytics.
--
-- failure_message:
--   Stripe's human-readable decline reason. Stored for support visibility.
--   e.g. "Your card was declined." / "Insufficient funds."
--   Each retry attempt is a new row, so retry history is fully preserved.
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Every payment belongs to one booking.
    -- RESTRICT prevents deleting a booking that has payment history.
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,

    -- ── Stripe identifiers ────────────────────────────────────────────────────
    -- pi_xxx — the specific charge attempt. UNIQUE because each PaymentIntent
    -- is a distinct Stripe object. Retry = new PaymentIntent = new row here.
    stripe_payment_intent_id TEXT UNIQUE,

    -- in_xxx — the Stripe Invoice. For subscriptions: one per billing period.
    -- For one-time: Stripe may or may not create an invoice (config-dependent).
    stripe_invoice_id TEXT UNIQUE,

    -- re_xxx — the Stripe Refund object. NULL until a refund is issued.
    -- For partial refunds at MVP: one refund per payment row is sufficient.
    -- Add a refunds table later if you need multiple partial refund tracking.
    stripe_refund_id TEXT,

    -- ── Amount ────────────────────────────────────────────────────────────────
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),  -- €89.00 = 8900
    currency     TEXT    NOT NULL DEFAULT 'eur',

    -- ── Status ────────────────────────────────────────────────────────────────
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')
    ),

    -- Stripe's decline reason if status = 'failed'. e.g. "Insufficient funds."
    failure_message TEXT,

    -- ── Billing period this invoice covers ────────────────────────────────────
    billing_period_start TIMESTAMPTZ,  -- e.g. 2025-06-01 00:00:00 UTC
    billing_period_end   TIMESTAMPTZ,  -- e.g. 2025-07-01 00:00:00 UTC

    -- ── Visit entitlement for this invoice ────────────────────────────────────
    -- Snapshot: how many visits does this payment include?
    -- Redundant with bookings.visits_per_month but enables per-invoice display.
    visits_covered INTEGER,

    -- ── Metadata ──────────────────────────────────────────────────────────────
    -- True for the first invoice (billing_reason='subscription_create').
    is_first_payment BOOLEAN     DEFAULT false,
    paid_at          TIMESTAMPTZ,    -- when Stripe confirmed successful payment
    refunded_at      TIMESTAMPTZ,    -- when refund was issued

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

-- RLS
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 10. STRIPE_WEBHOOK_EVENTS TABLE (NEW in v2)
-- ============================================================================
-- PURPOSE: Idempotency log for Stripe webhook events. Prevents duplicate
--   processing when Stripe retries delivery.
--
-- WHY THIS IS NON-NEGOTIABLE:
--   Stripe retries webhook delivery for up to 72 hours if your endpoint
--   returns anything other than HTTP 2xx. This means the SAME event can
--   arrive 3, 5, or 20 times. Without this table:
--     • A booking gets confirmed twice → two confirmation emails sent
--     • A payment is recorded twice → wrong revenue in your dashboard
--     • A subscription cancellation fires twice → error in your handler
--
-- HOW IDEMPOTENCY WORKS WITH THIS TABLE:
--   1. Webhook arrives (evt_xxx)
--   2. Your handler: SELECT id FROM stripe_webhook_events WHERE stripe_event_id = 'evt_xxx'
--   3. If found AND processed = true → return 200 immediately, do nothing
--   4. If not found → INSERT this row, process the event, set processed = true
--
-- SECONDARY BENEFITS:
--   • Full audit log: every event Stripe ever sent is permanently recorded
--   • Replay capability: if a handler had a bug, you can replay the event
--   • Failure visibility: processed=false rows show events that need retry
--   • Debugging: payload JSONB lets you query inside event data
--
-- stripe_event_id (evt_xxx):
--   Stripe's globally unique event identifier. The UNIQUE constraint here
--   IS your idempotency guarantee — inserting the same evt_xxx twice will fail.
--
-- payload (JSONB):
--   The complete raw Stripe event JSON. Always store it. Reasons:
--   regulatory audit trail, debugging, replaying events, support queries.
--
-- processing_error:
--   If your handler threw an error mid-processing, store the message.
--   Enables "show me all failed webhook events" admin queries.
--
-- related_booking_id:
--   Set during processing once you've resolved which booking this event
--   belongs to. Enables "show me all webhook events for booking X".
-- ============================================================================

CREATE TABLE stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stripe's unique event ID. UNIQUE = the idempotency guarantee.
    -- Inserting the same evt_xxx twice will throw a unique violation —
    -- your handler catches this and returns 200 without reprocessing.
    stripe_event_id TEXT NOT NULL UNIQUE,

    -- e.g. 'checkout.session.completed', 'invoice.paid', 'charge.refunded'
    event_type TEXT NOT NULL,

    -- Complete raw Stripe event JSON. Store always. Never truncate.
    payload JSONB NOT NULL,

    -- false on insert. Set to true after your handler completes successfully.
    processed BOOLEAN DEFAULT false,

    -- Error message if handler threw. NULL on success.
    -- Allows ops team to identify and retry failed events.
    processing_error TEXT,

    -- Set during processing once the booking is identified.
    related_booking_id UUID REFERENCES bookings(id),

    received_at  TIMESTAMPTZ DEFAULT NOW(),  -- when webhook arrived at your server
    processed_at TIMESTAMPTZ                 -- when handler completed (NULL if failed)
);

CREATE INDEX idx_webhook_events_stripe_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_event_type      ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed       ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_related_booking ON stripe_webhook_events(related_booking_id);

-- No RLS — accessed only via service role key in webhook handlers.
-- Never expose to client or authenticated users directly.


-- ============================================================================
-- 11. CUSTOMER_PAYMENT_METHODS TABLE
-- ============================================================================
-- PURPOSE: Stores saved Stripe payment methods for authenticated customers.
--   Enables future bookings without re-entering card details.
--   Guest customers cannot save payment methods (requires auth).
--
-- RELATIONSHIP TO customers.stripe_customer_id:
--   customers.stripe_customer_id is set at first Checkout — before any card
--   is saved. This table is populated AFTER a customer saves their card,
--   which only authenticated users can do. The Stripe Customer exists in
--   both places; this table has card-level detail.
--
-- stripe_customer_id HERE vs ON customers:
--   Having it on both is intentional. This table mirrors the Stripe
--   PaymentMethod object which always carries the customer ID. It allows
--   querying "what cards does customer X have?" without joining customers.
-- ============================================================================

CREATE TABLE customer_payment_methods (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id              UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,   -- pm_xxx
    stripe_customer_id       TEXT NOT NULL,           -- cus_xxx (denormalized for convenience)
    card_brand               TEXT,       -- 'visa', 'mastercard', 'amex'
    card_last4               TEXT,       -- '4242'
    card_exp_month           INTEGER,    -- 12
    card_exp_year            INTEGER,    -- 2027
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 12. QUOTE_REQUESTS TABLE
-- ============================================================================
-- PURPOSE: Lead capture for customers who want a custom quote before booking.
--   Not linked to bookings — quote requests are pre-booking enquiries that
--   may or may not convert. When they do convert, a booking is created
--   separately and the quote_request.status is set to 'converted'.
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
    ON quote_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all quote requests"
    ON quote_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 13. AVAILABILITY_SLOTS TABLE
-- ============================================================================
-- PURPOSE: Defines which time windows are available for residential bookings.
--   The booking flow queries this to show available slots for a given date.
--   Office bookings do not use this — their schedule is in office_schedule_rules
--   and managed directly by the admin.
--
-- max_bookings: how many concurrent residential bookings can share this slot.
--   Currently 1 (one cleaner per slot). Increase to run parallel teams.
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

-- Monday–Friday, three slots per day
INSERT INTO availability_slots (day_of_week, start_time, end_time, is_available, max_bookings) VALUES
(1, '08:00', '11:00', true, 1), (1, '11:00', '14:00', true, 1), (1, '14:00', '17:00', true, 1),
(2, '08:00', '11:00', true, 1), (2, '11:00', '14:00', true, 1), (2, '14:00', '17:00', true, 1),
(3, '08:00', '11:00', true, 1), (3, '11:00', '14:00', true, 1), (3, '14:00', '17:00', true, 1),
(4, '08:00', '11:00', true, 1), (4, '11:00', '14:00', true, 1), (4, '14:00', '17:00', true, 1),
(5, '08:00', '11:00', true, 1), (5, '11:00', '14:00', true, 1), (5, '14:00', '17:00', true, 1);


-- ============================================================================
-- 14. HELPER FUNCTIONS
-- ============================================================================

-- ── Residential slot availability check ──────────────────────────────────────
-- Returns true if the slot has capacity on the given date.
-- Used by the booking flow before allowing a slot selection.
-- Server action also re-validates this immediately before INSERT (race safety).

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

    IF v_max_bookings IS NULL THEN
        RETURN false;
    END IF;

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
DECLARE
    v_day_of_week INTEGER;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    RETURN QUERY
    SELECT
        a.start_time,
        check_slot_availability(p_date, a.start_time) AS is_available
    FROM availability_slots a
    WHERE a.day_of_week = v_day_of_week
      AND a.is_available = true
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 15. AUTH UPGRADE FUNCTIONS
-- ============================================================================
-- When a guest later creates a Supabase account with the same email,
-- their customer record is automatically linked. Booking history is preserved.

CREATE OR REPLACE FUNCTION link_customer_to_auth(
    p_email        TEXT,
    p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    SELECT id INTO v_customer_id FROM customers WHERE email = p_email LIMIT 1;
    IF v_customer_id IS NULL THEN RETURN false; END IF;

    UPDATE customers
    SET auth_user_id = p_auth_user_id, updated_at = NOW()
    WHERE id = v_customer_id AND auth_user_id IS NULL;  -- never overwrite existing link

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM link_customer_to_auth(NEW.email, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ============================================================================
-- 16. ADMIN VIEWS
-- ============================================================================

-- ── Residential upcoming bookings ─────────────────────────────────────────────
CREATE VIEW v_admin_upcoming_bookings AS
SELECT
    b.id,
    b.booking_date,
    b.time_slot,
    b.status,
    b.payment_status,
    b.subscription_status,
    b.visits_per_month,
    b.current_period_end  AS next_billing_date,
    b.cancel_at_period_end,
    c.full_name           AS customer_name,
    c.email               AS customer_email,
    c.phone               AS customer_phone,
    s.name                AS service_name,
    b.service_type,
    b.plan_label,
    b.frequency,
    b.final_price,
    b.apartment_size,
    a.street_address || ', ' || a.city AS address,
    b.addons_snapshot,
    b.special_notes,
    (c.auth_user_id IS NOT NULL) AS is_authenticated
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services  s ON b.service_id  = s.id
JOIN addresses a ON b.address_id  = a.id
WHERE b.booking_date >= CURRENT_DATE
  AND (b.service_type IS NULL OR b.service_type != 'office')
ORDER BY b.booking_date, b.time_slot;

-- ── Office contracts ───────────────────────────────────────────────────────────
CREATE VIEW v_office_bookings AS
SELECT
    b.id,
    b.booking_date           AS contract_start_date,
    b.status,
    b.payment_status,
    b.subscription_status,
    b.frequency,
    b.office_name,
    b.office_size_sqm,
    b.weekly_hours,
    b.hourly_rate,
    b.monthly_estimate,
    b.evening_weekend_surcharge,
    b.current_period_end     AS next_billing_date,
    b.cancel_at_period_end,
    c.full_name              AS customer_name,
    c.email                  AS customer_email,
    c.phone                  AS customer_phone,
    (c.auth_user_id IS NOT NULL) AS is_authenticated,
    s.name                   AS service_name,
    a.street_address || ', ' || a.city AS address,
    (
        SELECT json_agg(
            json_build_object(
                'day',      osr.day_of_week,
                'start',    osr.start_time,
                'duration', osr.duration_hours
            ) ORDER BY osr.day_of_week
        )
        FROM office_schedule_rules osr
        WHERE osr.booking_id = b.id AND osr.is_active = true
    ) AS schedule_rules,
    b.special_notes,
    b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services  s ON b.service_id  = s.id
JOIN addresses a ON b.address_id  = a.id
WHERE b.service_type = 'office'
ORDER BY b.created_at DESC;

-- ── Subscription health dashboard ─────────────────────────────────────────────
-- Active subscriptions with payment history summary.
-- Answers: "which subscribers are past_due?", "who has failed payments?"
CREATE VIEW v_subscription_health AS
SELECT
    b.id                         AS booking_id,
    c.full_name                  AS customer_name,
    c.email                      AS customer_email,
    b.service_type,
    b.plan_label,
    b.frequency,
    b.visits_per_month,
    b.subscription_status,
    b.payment_status,
    b.current_period_start,
    b.current_period_end         AS next_billing_date,
    b.cancel_at_period_end,
    b.canceled_at,
    -- Payment aggregates from payments table
    COUNT(p.id)                                                          AS total_invoices,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END)
        / 100.0                                                          AS total_collected_eur,
    SUM(CASE WHEN p.status = 'failed'    THEN 1              ELSE 0 END) AS failed_payment_count,
    MAX(CASE WHEN p.status = 'succeeded' THEN p.paid_at END)             AS last_successful_payment,
    -- Stripe references
    b.stripe_subscription_id,
    b.stripe_price_id
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE b.frequency != 'one-time'
GROUP BY
    b.id, c.full_name, c.email,
    b.service_type, b.plan_label, b.frequency, b.visits_per_month,
    b.subscription_status, b.payment_status,
    b.current_period_start, b.current_period_end,
    b.cancel_at_period_end, b.canceled_at,
    b.stripe_subscription_id, b.stripe_price_id
ORDER BY b.created_at DESC;

-- ── Customer list with booking and payment stats ───────────────────────────────
CREATE VIEW v_customer_list AS
SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    (c.auth_user_id IS NOT NULL)     AS has_account,
    (c.stripe_customer_id IS NOT NULL) AS has_stripe_customer,
    COUNT(DISTINCT b.id)             AS total_bookings,
    MAX(b.booking_date)              AS last_booking_date,
    SUM(b.final_price)               AS total_billed,
    -- Actual collected from payments table (more accurate than final_price)
    COALESCE(
        SUM(p_agg.collected) / 100.0, 0
    )                                AS total_collected_eur,
    CASE
        WHEN COUNT(b.id) FILTER (WHERE b.frequency != 'one-time') > 0
        THEN 'Subscriber'
        ELSE 'One-time'
    END                              AS customer_type,
    c.created_at                     AS joined_date
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN LATERAL (
    SELECT SUM(amount_cents) AS collected
    FROM payments
    WHERE booking_id = b.id AND status = 'succeeded'
) p_agg ON true
GROUP BY c.id, c.full_name, c.email, c.phone, c.auth_user_id,
         c.stripe_customer_id, c.created_at
ORDER BY c.created_at DESC;

-- ── Failed webhook events (ops monitoring) ────────────────────────────────────
-- Shows events that were received but failed to process.
-- Ops team uses this to identify and manually replay problematic events.
CREATE VIEW v_failed_webhook_events AS
SELECT
    stripe_event_id,
    event_type,
    processing_error,
    related_booking_id,
    received_at,
    processed_at
FROM stripe_webhook_events
WHERE processed = false
   OR processing_error IS NOT NULL
ORDER BY received_at DESC;


-- ============================================================================
-- STRIPE PRICES TO CREATE (reference)
-- ============================================================================
-- Create these in Stripe Dashboard → Products → Add Product.
-- ALL subscription prices use interval='month' (1 month, not 1 week).
-- Store the resulting price_xxx in bookings.stripe_price_id at Checkout.
--
-- Maintenance — Studio (Yksiö):
--   Weekly:    price_weekly_maintenance_studio    → €X/month, recurring monthly
--   Biweekly:  price_biweekly_maintenance_studio  → €Y/month, recurring monthly
--   Monthly:   price_monthly_maintenance_studio   → €Z/month, recurring monthly
--   One-time:  price_onetime_maintenance_studio   → €89, one_time
--
-- Repeat per apartment type (two, three, four) and service type (deep cleaning).
-- Move-out: always one-time prices per apartment type.
-- Office: manual billing — Stripe integration phase 2.
--
-- ============================================================================
-- WEBHOOKS TO SUBSCRIBE IN STRIPE DASHBOARD
-- ============================================================================
-- checkout.session.completed    → confirm booking, set subscription_id
-- invoice.paid                  → record payment, update billing period,
--                                  trigger visit slot generation
-- invoice.payment_failed        → record failure, set past_due, send email
-- customer.subscription.updated → sync subscription_status, cancel_at_period_end
-- customer.subscription.deleted → set canceled, record canceled_at
-- charge.refunded               → update payments row with refund data
-- checkout.session.expired      → optional: notify customer, clean up pending booking
--
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================