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
--   v4  — Voucher and first-booking discount system:
--          vouchers table (marketing codes + Stripe coupon references),
--          voucher_redemptions table (immutable redemption ledger),
--          bookings discount snapshot fields,
--          atomic increment_voucher_usage() function,
--          admin voucher reporting view
--
-- TABLE INVENTORY (16 tables + admin views)
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
--   Voucher system (v4)
--     vouchers                  — marketing codes + Stripe coupon references
--     voucher_redemptions       — immutable ledger of every successful use
--
--   Operations
--     availability_slots        — residential booking time slots
--     quote_requests            — lead generation / enquiry capture
--
-- ============================================================================
-- VOUCHER ARCHITECTURE (v4)
-- ============================================================================
--
-- TWO DISCOUNT MECHANISMS — designed separately, applied through the same path:
--
--   1. AUTOMATIC FIRST-BOOKING DISCOUNT
--      Triggered automatically when a customer has zero confirmed+paid bookings.
--      Always 20% off. No code required.
--      Stripe coupon: FROSH_FIRST_20 (created once via seed script).
--      Stored in env var: STRIPE_COUPON_FIRST_BOOKING_20
--      Recorded on: bookings.is_first_booking + bookings.discount_source
--      NOT recorded in voucher_redemptions (no voucher row involved).
--
--   2. VOUCHER / PROMOTIONAL CODES
--      Customer enters a code (WELCOME20, SUMMER25, etc.).
--      Validated server-side in submitBookingAction — client value never trusted.
--      Each voucher row references a Stripe coupon via stripe_coupon_id.
--      Redemption recorded in voucher_redemptions (append-only).
--
--   STACKING RULE: Never. Apply whichever discount is larger.
--
--   STRIPE INTEGRATION:
--     The winning Stripe coupon ID is passed to Checkout Session as:
--       discounts: [{ coupon: stripe_coupon_id }]
--     Stripe applies the discount to line items and shows the breakdown in UI.
--     bookings.stripe_coupon_id records which coupon was applied.
--     bookings.final_price = post-discount amount (what Stripe charges).
--     bookings.original_final_price = pre-discount amount (for reporting).
--
-- ============================================================================


-- ============================================================================
-- 0. SHARED TRIGGER FUNCTION
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
-- ADMIN ONLY — CUSTOMERS NEVER GET A PROFILES ROW.
-- ============================================================================

CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name  TEXT,
    phone      TEXT,
    role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
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

CREATE TABLE customers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE CHECK (email = LOWER(TRIM(email))),
    full_name    TEXT NOT NULL,
    phone        TEXT,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    stripe_customer_id       TEXT UNIQUE,
    magic_link_sent_at       TIMESTAMPTZ,
    onboarding_completed_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email              ON customers(email);
CREATE INDEX idx_customers_auth_user_id       ON customers(auth_user_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_magic_link_sent_at ON customers(magic_link_sent_at)
    WHERE magic_link_sent_at IS NOT NULL;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own record"
    ON customers FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Customer can update own record"
    ON customers FOR UPDATE
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can manage all customers"
    ON customers FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 3. ADDRESSES TABLE
-- ============================================================================

CREATE TABLE addresses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE USING (auth.uid() = user_id);

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
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 4. SERVICES TABLE
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
    ON services FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage services"
    ON services FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 5. SUBSCRIPTION_PLANS TABLE
-- ============================================================================

CREATE TABLE subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    frequency           TEXT NOT NULL UNIQUE
        CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    discount_percentage DECIMAL(5,2) NOT NULL
        CHECK (discount_percentage BETWEEN 0 AND 100),
    description         TEXT,
    is_active           BOOLEAN DEFAULT true,
    visits_per_month    INTEGER NOT NULL DEFAULT 1
        CHECK (visits_per_month IN (1, 2, 4)),
    stripe_billing_interval TEXT NOT NULL DEFAULT 'month'
        CHECK (stripe_billing_interval = 'month'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, frequency, discount_percentage, description, visits_per_month) VALUES
('Weekly Plan',    'weekly',   15.00, 'Save 15% — 4 cleaning visits per month, billed monthly', 4),
('Bi-Weekly Plan', 'biweekly', 10.00, 'Save 10% — 2 cleaning visits per month, billed monthly', 2),
('Monthly Plan',   'monthly',   5.00, 'Save 5%  — 1 cleaning visit per month, billed monthly',  1);


-- ============================================================================
-- 6. VOUCHERS TABLE (v4)
-- ============================================================================
-- PURPOSE: Marketing promotional codes and their Stripe coupon references.
--   Each row is a voucher code that customers can enter at checkout.
--   The stripe_coupon_id references a pre-created Stripe Coupon object.
--   Your database is the source of truth for eligibility, limits, and expiry.
--   Stripe only applies the math after your server-side validation passes.
--
-- STRIPE COUPON SETUP (one-time, run scripts/seed-stripe-coupons.ts):
--   FROSH_FIRST_20   — 20% off, duration: once  → STRIPE_COUPON_FIRST_BOOKING_20
--   Marketing coupons (WELCOME20, SUMMER25, etc.) are created manually in
--   the Stripe Dashboard and their IDs stored in vouchers.stripe_coupon_id.
--
-- FIRST-BOOKING DISCOUNT:
--   Does NOT use this table. It uses the STRIPE_COUPON_FIRST_BOOKING_20 env var
--   directly, recorded on bookings.is_first_booking and bookings.discount_source.
--
-- COLUMN NOTES:
--   code                  — uppercase canonical form, e.g. 'WELCOME20'
--   discount_type         — 'percentage' or 'fixed_amount'
--   discount_value        — percentage: 1–100; fixed_amount: cents (2000 = €20)
--   stripe_coupon_id      — the Stripe Coupon object ID to pass to Checkout
--   applicable_services   — null = all services; ['maintenance','moveout'] = restricted
--                           office cleaning is typically excluded
--   max_uses              — null = unlimited; positive integer = hard cap
--   times_used            — incremented atomically via increment_voucher_usage()
--                           NEVER incremented directly outside that function
--   max_uses_per_customer — 1 = one use per customer (default); higher = multi-use
--   is_active             — admin kill switch; disable without deleting history
-- ============================================================================

CREATE TABLE vouchers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  TEXT NOT NULL UNIQUE,
    description           TEXT,
    discount_type         TEXT NOT NULL
        CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value        INTEGER NOT NULL
        CHECK (discount_value > 0),
    -- Additional guard: percentage values must be ≤ 100
    -- fixed_amount values are in cents with no upper bound
    stripe_coupon_id      TEXT NOT NULL,
    applicable_services   TEXT[],
    is_active             BOOLEAN NOT NULL DEFAULT true,
    max_uses              INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
    times_used            INTEGER NOT NULL DEFAULT 0
        CHECK (times_used >= 0),
    max_uses_per_customer INTEGER NOT NULL DEFAULT 1
        CHECK (max_uses_per_customer >= 1),
    expires_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),

    -- Enforce percentage ≤ 100 at the DB level
    CONSTRAINT vouchers_percentage_max
        CHECK (discount_type != 'percentage' OR discount_value <= 100)
);

-- Fast lookup by code on every validation call
CREATE UNIQUE INDEX idx_vouchers_code ON vouchers (code);

-- Partial index: only active vouchers are queried in hot paths
CREATE INDEX idx_vouchers_active ON vouchers (is_active)
    WHERE is_active = true;

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Customers never read vouchers directly — validateVoucher uses service role
CREATE POLICY "Admins can manage all vouchers"
    ON vouchers FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 7. VOUCHER_REDEMPTIONS TABLE (v4)
-- ============================================================================
-- PURPOSE: Immutable ledger of every successful voucher use.
--   One row per booking that used a voucher code.
--   NEVER updated after INSERT. If a reversal is needed, record it separately.
--   First-booking discounts are NOT recorded here (no voucher row involved).
--
-- IDEMPOTENCY:
--   UNIQUE constraint on booking_id prevents double-redemption even if the
--   webhook retries. The upsert in the webhook handler uses:
--     ON CONFLICT (booking_id) DO NOTHING
--
-- SNAPSHOT PATTERN:
--   discount_type, discount_value, and stripe_coupon_id are snapshotted at
--   redemption time. If the voucher is later edited or deleted, historical
--   records remain accurate.
--
-- COLUMN NOTES:
--   discount_amount_cents   — actual euros saved on this booking
--   original_amount_cents   — pre-discount price (for reconciliation)
--   final_amount_cents      — post-discount price = what Stripe charged
--   stripe_session_id       — links back to the specific Checkout Session
-- ============================================================================

CREATE TABLE voucher_redemptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id            UUID NOT NULL REFERENCES vouchers(id),
    booking_id            UUID NOT NULL UNIQUE REFERENCES bookings(id),
    customer_id           UUID NOT NULL REFERENCES customers(id),

    -- Snapshots — never derived from voucher row after the fact
    discount_type         TEXT NOT NULL,
    discount_value        INTEGER NOT NULL,
    stripe_coupon_id      TEXT NOT NULL,

    -- Financial snapshot
    discount_amount_cents INTEGER NOT NULL CHECK (discount_amount_cents > 0),
    original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents > 0),
    final_amount_cents    INTEGER NOT NULL CHECK (final_amount_cents >= 0),

    stripe_session_id     TEXT NOT NULL,
    redeemed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-voucher reporting: "show all redemptions for voucher X"
CREATE INDEX idx_redemptions_voucher_id ON voucher_redemptions (voucher_id);

-- Per-customer queries: "has this customer used this voucher before?"
CREATE INDEX idx_redemptions_customer_id ON voucher_redemptions (customer_id);

-- Per-customer-per-voucher limit enforcement
CREATE INDEX idx_redemptions_customer_voucher
    ON voucher_redemptions (customer_id, voucher_id);

ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Customers can view their own redemption history in the dashboard
CREATE POLICY "Customer can view own redemptions"
    ON voucher_redemptions FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all redemptions"
    ON voucher_redemptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- 8. BOOKINGS TABLE (v4 — updated with discount snapshot fields)
-- ============================================================================
-- DISCOUNT SNAPSHOT FIELDS (v4):
--   All discount fields are set atomically in submitBookingAction before the
--   Stripe session is created. They are never recalculated after the fact.
--
--   is_first_booking       — true if this was the customer's first confirmed
--                            booking. Evaluated at submission time by counting
--                            confirmed+paid bookings for this customer_id.
--                            Used to trigger the automatic 20% discount.
--
--   discount_source        — which mechanism produced the discount:
--                            'first_booking' = automatic 20% off first booking
--                            'voucher'       = customer-entered voucher code
--                            NULL            = no discount applied
--
--   voucher_id             — FK to vouchers. NULL when discount_source is
--                            'first_booking' or no discount was applied.
--
--   voucher_code           — the code string as entered (display + support).
--                            NULL when no voucher was applied.
--
--   stripe_coupon_id       — the Stripe Coupon ID that was passed to the
--                            Checkout Session via discounts: [{ coupon: ... }].
--                            NULL when no discount was applied.
--                            This is the link between the DB discount decision
--                            and the Stripe Checkout session.
--
--   discount_amount_cents  — the actual discount in cents, snapshotted at
--                            booking time. NULL when no discount.
--                            For percentage discounts: ROUND(original × pct / 100).
--                            For fixed discounts: MIN(value, original_cents).
--
--   original_final_price   — the price before any discount was applied.
--                            NULL when no discount.
--                            final_price = original_final_price - (discount_amount_cents / 100)
--                            Both values are stored so either can be displayed
--                            without recalculation.
--
--   final_price (existing) — already existed; continues to mean "what the
--                            customer actually pays" = post-discount amount.
--                            When no discount: final_price = original price.
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
    -- final_price = post-discount amount = what Stripe charges the customer.
    -- When no discount: final_price = base price + addons.
    final_price DECIMAL(10,2) NOT NULL,
    base_price  DECIMAL(10,2),

    -- ── Stripe identifiers ────────────────────────────────────────────────────
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id   TEXT,
    stripe_subscription_id     TEXT,
    stripe_price_id            TEXT,
    stripe_product_id          TEXT,

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
    addons_snapshot JSONB DEFAULT '{}',

    -- ── Notes ────────────────────────────────────────────────────────────────
    special_notes TEXT,

    -- ── Office-specific columns ───────────────────────────────────────────────
    office_name               TEXT,
    office_size_sqm           INTEGER,
    weekly_hours              DECIMAL(5,2),
    hourly_rate               DECIMAL(10,2),
    recurring_time            TIME,
    evening_weekend_surcharge BOOLEAN DEFAULT false,
    monthly_estimate          DECIMAL(10,2),
    estimated_hours           NUMERIC(4,1),
    hourly_rate_cents         INTEGER,
    quoted_amount_cents       INTEGER GENERATED ALWAYS AS (
        ROUND(estimated_hours * hourly_rate_cents)
    ) STORED,

    -- ── Discount snapshot (v4) ────────────────────────────────────────────────
    -- Set once in submitBookingAction before Stripe session creation.
    -- Never recalculated after booking creation.

    -- Was this the customer's first confirmed+paid booking?
    -- Evaluated server-side at submission time.
    is_first_booking BOOLEAN NOT NULL DEFAULT false,

    -- Which discount mechanism was applied. NULL = no discount.
    discount_source TEXT CHECK (
        discount_source IN ('first_booking', 'voucher')
    ),

    -- FK to the voucher used. NULL when discount_source = 'first_booking'
    -- or no discount was applied.
    voucher_id UUID REFERENCES vouchers(id),

    -- The code string as entered by the customer — for display and support.
    -- NULL when no voucher was applied.
    voucher_code TEXT,

   

    -- Discount amount in cents. NULL when no discount.
    -- Snapshotted at booking time — never derived from the voucher row later.
    discount_amount_cents INTEGER CHECK (
        discount_amount_cents IS NULL OR discount_amount_cents > 0
    ),

    

    -- ── Consistency guard ─────────────────────────────────────────────────────
    -- When a discount is recorded, all discount fields must be present.
    -- Prevents partial discount snapshots from entering the DB.
    CONSTRAINT bookings_discount_consistency CHECK (
        -- No discount: all fields null
        (discount_source IS NULL
            AND voucher_id IS NULL
            AND voucher_code IS NULL
            AND stripe_coupon_id IS NULL
            AND discount_amount_cents IS NULL
            AND original_final_price IS NULL)
        OR
        -- First-booking discount: voucher fields null, price fields present
        (discount_source = 'first_booking'
            AND voucher_id IS NULL
            AND stripe_coupon_id IS NOT NULL
            AND discount_amount_cents IS NOT NULL
            AND original_final_price IS NOT NULL)
        OR
        -- Voucher discount: all discount fields present
        (discount_source = 'voucher'
            AND voucher_id IS NOT NULL
            AND voucher_code IS NOT NULL
            AND stripe_coupon_id IS NOT NULL
            AND discount_amount_cents IS NOT NULL
            AND original_final_price IS NOT NULL)
    ),

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
-- Partial indexes for discount reporting queries
CREATE INDEX idx_bookings_first_booking           ON bookings(customer_id)
    WHERE is_first_booking = true;
CREATE INDEX idx_bookings_voucher_id              ON bookings(voucher_id)
    WHERE voucher_id IS NOT NULL;

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 9. OFFICE_SCHEDULE_RULES TABLE
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
-- 10. BOOKING_EXTRAS TABLE
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
-- 11. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE payments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_invoice_id        TEXT UNIQUE,
    stripe_refund_id         TEXT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency     TEXT    NOT NULL DEFAULT 'eur',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')
    ),
    failure_message      TEXT,
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
-- 12. STRIPE_WEBHOOK_EVENTS TABLE
-- ============================================================================

CREATE TABLE stripe_webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
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


-- ============================================================================
-- 13. CUSTOMER_PAYMENT_METHODS TABLE
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
-- 14. QUOTE_REQUESTS TABLE
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
    status        TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
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
-- 15. AVAILABILITY_SLOTS TABLE
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
-- 16. HELPER FUNCTIONS
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
-- 17. VOUCHER FUNCTIONS (v4)
-- ============================================================================
-- increment_voucher_usage()
-- ─────────────────────────────────────────────────────────────────────────────
-- Atomically increments vouchers.times_used, conditional on max_uses.
-- Called from the checkout.session.completed webhook handler ONLY —
-- never from submitBookingAction (which runs before payment is confirmed).
--
-- Returns TRUE  if the increment succeeded (voucher had remaining uses).
-- Returns FALSE if the voucher was already exhausted (race condition).
--
-- RACE CONDITION HANDLING:
--   Two customers simultaneously use the last available redemption.
--   Both pass the server-side validation check in submitBookingAction.
--   Both proceed to Stripe Checkout and both pay.
--   The first webhook to arrive increments times_used to max_uses.
--   The second webhook's call returns FALSE.
--   The webhook handler logs this prominently for manual review.
--   The discount was already applied by Stripe — the customer was charged
--   the discounted amount. Manual review resolves the edge case.
--   This is extremely rare in practice at this business scale.
--
-- SECURITY DEFINER: runs as the function owner, bypassing RLS.
-- Only called from server-side webhook handler (service role context).
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_voucher_usage(p_voucher_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE vouchers
    SET times_used = times_used + 1
    WHERE id = p_voucher_id
      AND (max_uses IS NULL OR times_used < max_uses);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 18. AUTH UPGRADE FUNCTIONS (v3)
-- ============================================================================

CREATE OR REPLACE FUNCTION link_customer_to_auth(
    p_email        TEXT,
    p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE customers
    SET
        auth_user_id            = p_auth_user_id,
        onboarding_completed_at = NOW(),
        updated_at              = NOW()
    WHERE id            = v_customer_id
      AND auth_user_id IS NULL;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        PERFORM link_customer_to_auth(NEW.email, NEW.id);
        RAISE NOTICE '[handle_new_auth_user] Processed: %', NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_new_auth_user] Failed for %: %', NEW.email, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ============================================================================
-- 19. ADMIN VIEWS (v4 — updated + new voucher view)
-- ============================================================================

CREATE VIEW v_admin_upcoming_bookings AS
SELECT
    b.id, b.booking_date, b.time_slot, b.status, b.payment_status,
    b.subscription_status, b.visits_per_month,
    b.current_period_end AS next_billing_date, b.cancel_at_period_end,
    c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
    s.name AS service_name, b.service_type, b.plan_label, b.frequency,
    b.final_price, b.apartment_size,
    -- v4: discount summary for ops view
    b.is_first_booking,
    b.discount_source,
    b.voucher_code,
    b.discount_amount_cents,
    b.original_final_price,
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


-- ── v4 NEW: Voucher performance view ──────────────────────────────────────────
-- Shows per-voucher usage stats and revenue impact.
-- Used by the admin voucher management page.

CREATE VIEW v_voucher_performance AS
SELECT
    v.id,
    v.code,
    v.description,
    v.discount_type,
    v.discount_value,
    v.stripe_coupon_id,
    v.applicable_services,
    v.is_active,
    v.max_uses,
    v.times_used,
    v.max_uses_per_customer,
    v.expires_at,
    v.created_at,
    -- Redemption aggregates (from the immutable ledger)
    COUNT(vr.id)                                                 AS total_redemptions,
    COUNT(DISTINCT vr.customer_id)                               AS unique_customers,
    COALESCE(SUM(vr.discount_amount_cents), 0) / 100.0          AS total_discount_given_eur,
    COALESCE(SUM(vr.original_amount_cents), 0) / 100.0          AS total_original_revenue_eur,
    COALESCE(SUM(vr.final_amount_cents), 0) / 100.0             AS total_collected_eur,
    MAX(vr.redeemed_at)                                          AS last_redeemed_at
FROM vouchers v
LEFT JOIN voucher_redemptions vr ON v.id = vr.voucher_id
GROUP BY
    v.id, v.code, v.description, v.discount_type, v.discount_value,
    v.stripe_coupon_id, v.applicable_services, v.is_active,
    v.max_uses, v.times_used, v.max_uses_per_customer,
    v.expires_at, v.created_at
ORDER BY v.created_at DESC;


-- ── v4 NEW: First-booking discount summary view ────────────────────────────────
-- Shows aggregate stats for the automatic first-booking discount programme.

CREATE VIEW v_first_booking_discounts AS
SELECT
    COUNT(*)                                              AS total_first_booking_discounts,
    COALESCE(SUM(discount_amount_cents), 0) / 100.0      AS total_discount_given_eur,
    COALESCE(SUM(original_final_price * 100), 0) / 100.0 AS total_original_revenue_eur,
    COALESCE(SUM(final_price * 100), 0) / 100.0          AS total_collected_eur,
    MIN(created_at)                                       AS first_issued_at,
    MAX(created_at)                                       AS last_issued_at
FROM bookings
WHERE discount_source = 'first_booking'
  AND payment_status  = 'paid';


-- ============================================================================
-- MIGRATION CHECKLIST (v4 — apply to existing v3 database)
-- ============================================================================
-- Run these if upgrading from v3. Do NOT re-run on fresh installs.
--
-- -- 1. Create vouchers table (no dependencies on existing tables)
-- -- (run the full CREATE TABLE vouchers statement above)
--
-- -- 2. Create voucher_redemptions table
-- -- (run the full CREATE TABLE voucher_redemptions statement above)
--
-- -- 3. Add discount snapshot columns to bookings
-- ALTER TABLE bookings
--   ADD COLUMN IF NOT EXISTS is_first_booking      BOOLEAN NOT NULL DEFAULT false,
--   ADD COLUMN IF NOT EXISTS discount_source        TEXT
--     CHECK (discount_source IN ('first_booking', 'voucher')),
--   ADD COLUMN IF NOT EXISTS voucher_id             UUID REFERENCES vouchers(id),
--   ADD COLUMN IF NOT EXISTS voucher_code           TEXT,
--   ADD COLUMN IF NOT EXISTS stripe_coupon_id       TEXT,
--   ADD COLUMN IF NOT EXISTS discount_amount_cents  INTEGER
--     CHECK (discount_amount_cents IS NULL OR discount_amount_cents > 0),
--   ADD COLUMN IF NOT EXISTS original_final_price   DECIMAL(10,2);
--
-- -- 4. Add consistency constraint (existing rows all have NULL discount fields
-- --    so the first branch of the CHECK passes cleanly)
-- ALTER TABLE bookings
--   ADD CONSTRAINT bookings_discount_consistency CHECK (
--     (discount_source IS NULL
--         AND voucher_id IS NULL AND voucher_code IS NULL
--         AND stripe_coupon_id IS NULL AND discount_amount_cents IS NULL
--         AND original_final_price IS NULL)
--     OR
--     (discount_source = 'first_booking'
--         AND voucher_id IS NULL AND stripe_coupon_id IS NOT NULL
--         AND discount_amount_cents IS NOT NULL AND original_final_price IS NOT NULL)
--     OR
--     (discount_source = 'voucher'
--         AND voucher_id IS NOT NULL AND voucher_code IS NOT NULL
--         AND stripe_coupon_id IS NOT NULL AND discount_amount_cents IS NOT NULL
--         AND original_final_price IS NOT NULL)
--   );
--
-- -- 5. Add partial indexes for discount reporting
-- CREATE INDEX IF NOT EXISTS idx_bookings_first_booking
--   ON bookings(customer_id) WHERE is_first_booking = true;
-- CREATE INDEX IF NOT EXISTS idx_bookings_voucher_id
--   ON bookings(voucher_id) WHERE voucher_id IS NOT NULL;
--
-- -- 6. Create increment_voucher_usage function
-- -- (run the full CREATE OR REPLACE FUNCTION statement above)
--
-- -- 7. Add RLS policies for vouchers and voucher_redemptions
-- -- (run the ALTER TABLE ... ENABLE ROW LEVEL SECURITY + CREATE POLICY statements above)
--
-- -- 8. Create admin views
-- -- (run v_voucher_performance and v_first_booking_discounts above)
-- -- Optionally recreate v_admin_upcoming_bookings to include discount columns
--
-- -- 9. Run Stripe coupon seed script
-- --   STRIPE_SECRET_KEY=sk_test_... npx ts-node scripts/seed-stripe-coupons.ts
-- -- Then add to Vercel env vars:
-- --   STRIPE_COUPON_FIRST_BOOKING_20=FROSH_FIRST_20
--
-- ============================================================================
-- WEBHOOKS TO SUBSCRIBE IN STRIPE DASHBOARD
-- ============================================================================
-- checkout.session.completed    → confirm booking, record voucher redemption
-- invoice.paid                  → record payment, update billing period
-- invoice.payment_failed        → record failure, set past_due, send email
-- customer.subscription.updated → sync subscription_status, cancel_at_period_end
-- customer.subscription.deleted → set canceled, record canceled_at
-- charge.refunded               → update payments row with refund data
-- checkout.session.expired      → optional: notify customer, clean pending booking
--
-- ============================================================================
-- END OF SCHEMA v4
-- ============================================================================