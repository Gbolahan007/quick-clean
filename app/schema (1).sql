-- ============================================================================
-- CLEANING SERVICE PLATFORM - PHASE 1 MVP SCHEMA
-- Updated: Office cleaning support integrated
-- ============================================================================
-- ARCHITECTURE SUMMARY:
-- 1. customers table — standalone identity, no auth dependency (guest-first)
-- 2. addresses.user_id nullable, customer_id added
-- 3. bookings.customer_id → customers.id (not profiles.id)
-- 4. bookings has snapshot columns (service, apartment, addons)
-- 5. bookings has 7 office columns (nullable, only set for service_type='office')
-- 6. customer_payment_methods → customers.id (not profiles.id)
-- 7. Auth upgrade trigger: links customer → auth.users automatically
-- 8. office_schedule_rules — recurring day/time pattern for office contracts
-- 9. Admin views updated for both residential and office bookings
-- ============================================================================


-- ============================================================================
-- 0. SHARED TRIGGER FUNCTION
-- ============================================================================
-- Must exist before any trigger references it.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. PROFILES TABLE (Authenticated User Management)
-- ============================================================================
-- Extends Supabase auth.users with role/admin data.
-- ONLY for users who have completed auth (admins, returning authenticated users).
-- Guest customers do NOT have a profiles row — they use the customers table.
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
-- 2. CUSTOMERS TABLE (Guest + Authenticated Customer Identity)
-- ============================================================================
-- Standalone identity table — exists independently of auth.users.
-- Guest customers are created here at booking time with auth_user_id = NULL.
-- When a guest later creates an account, auth_user_id is populated automatically
-- via the handle_new_auth_user trigger (see section 12).
--
-- Relationship:
--   Guest:         customers.auth_user_id = NULL
--   Authenticated: customers.auth_user_id → auth.users.id
-- ============================================================================

CREATE TABLE customers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,  -- identity anchor for guest flow
    full_name    TEXT NOT NULL,
    phone        TEXT,
    -- Nullable by design: populated ONLY after optional account creation.
    -- ON DELETE SET NULL: if auth user is deleted, customer history is preserved.
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email        ON customers(email);
CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);

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

-- Guest INSERT is handled via service role key in server actions — no RLS policy needed

CREATE POLICY "Admins can manage all customers"
    ON customers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 3. ADDRESSES TABLE (Customer Properties)
-- ============================================================================
-- user_id is nullable to support guests.
-- customer_id is the primary FK for the guest booking flow.
-- Authenticated users may also have user_id populated after onboarding.
-- ============================================================================

CREATE TABLE addresses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Legacy FK: populated only for fully authenticated users post-onboarding
    user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
    -- Guest FK: always populated for bookings made via the guest flow
    customer_id         UUID REFERENCES customers(id) ON DELETE CASCADE,
    street_address      TEXT NOT NULL,
    apartment_number    TEXT,
    city                TEXT NOT NULL,
    postal_code         TEXT NOT NULL,
    square_meters       INTEGER NOT NULL,
    number_of_rooms     INTEGER NOT NULL,
    access_instructions TEXT,
    is_default          BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Every address must be tied to either a customer or a profile
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

-- Authenticated users via profiles
CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

-- Authenticated customers via customers table
CREATE POLICY "Customer can view own addresses"
    ON addresses FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- Guest INSERT via service role in server actions — no policy needed

CREATE POLICY "Admins can manage all addresses"
    ON addresses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 4. SERVICES TABLE (Cleaning Packages)
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
('Maintenance Cleaning', 'Regular home cleaning - kitchen, bathroom, living areas', 80.00,  2.5, 1),
('Deep Cleaning',        'Thorough top-to-bottom cleaning including hard-to-reach areas', 150.00, 4.0, 2),
('Office Cleaning',      'Recurring office cleaning — priced per hour, scheduled weekly', 0.00,  1.0, 3);
-- Office base_price = 0 because office pricing is driven by weekly_hours × hourly_rate,
-- not a fixed per-visit price. final_price on the booking holds the first-visit amount;
-- monthly_estimate holds the Stripe subscription figure.


-- ============================================================================
-- 5. SUBSCRIPTION_PLANS TABLE (Frequency Options)
-- ============================================================================
-- Used by residential bookings. Office contracts use weekly_hours + hourly_rate
-- directly and do not reference subscription_plans.
-- ============================================================================

CREATE TABLE subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    frequency           TEXT NOT NULL UNIQUE CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    description         TEXT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, frequency, discount_percentage, description) VALUES
('Weekly Plan',    'weekly',   15.00, 'Save 15% with weekly cleaning'),
('Bi-Weekly Plan', 'biweekly', 10.00, 'Save 10% with cleaning every 2 weeks'),
('Monthly Plan',   'monthly',   5.00, 'Save 5% with monthly cleaning');


-- ============================================================================
-- 6. BOOKINGS TABLE (Customer Appointments)
-- ============================================================================
-- Unified table for residential and office bookings.
-- Office-specific columns are nullable — NULL means "not applicable".
--
-- HOW OFFICE BOOKINGS USE THIS TABLE:
--   service_type      = 'office'
--   booking_date      = first visit date (required by NOT NULL)
--   time_slot         = same as recurring_time (first visit start)
--   frequency         = 'weekly' (office contracts are always recurring)
--   final_price       = amount for the first visit or first month
--   monthly_estimate  = weekly_hours × hourly_rate × 4.33 (Stripe amount)
--   subscription_plan_id = NULL (office uses its own pricing model)
--
-- Office schedule pattern lives in office_schedule_rules (one row per day).
--
-- SNAPSHOT COLUMNS (denormalized):
--   Services, prices, and apartment definitions change over time.
--   Snapshots preserve exactly what the customer selected and paid for,
--   ensuring historical accuracy for receipts, disputes, and admin views.
--
-- addons_snapshot shape:
--   { "count": 2, "rawTotal": 80, "discount": 8,
--     "discountedTotal": 72, "names": ["Oven cleaning", "Window cleaning ×2"] }
-- ============================================================================

CREATE TABLE bookings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Relationships ────────────────────────────────────────────────────────
    customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    service_id           UUID NOT NULL REFERENCES services(id)  ON DELETE RESTRICT,
    address_id           UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    -- NULL for office bookings (office has its own pricing model)
    subscription_plan_id UUID REFERENCES subscription_plans(id),

    -- ── Scheduling ───────────────────────────────────────────────────────────
    -- For office bookings: first visit date / default start time.
    -- Recurring pattern is stored in office_schedule_rules.
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

    -- ── Payment ──────────────────────────────────────────────────────────────
    stripe_payment_intent_id TEXT,
    stripe_subscription_id   TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refunded')
    ),

    -- ── Service snapshot (denormalized) ──────────────────────────────────────
    service_type TEXT CHECK (service_type IN ('maintenance', 'deep', 'office')),
    plan_key     TEXT,
    plan_label   TEXT,
    show_deducted BOOLEAN DEFAULT false,

    -- ── Residential apartment snapshot (denormalized) ─────────────────────────
    -- NULL for office bookings.
    apartment_key   TEXT,
    apartment_label TEXT,
    apartment_size  TEXT,

    -- ── Addons snapshot (JSONB) ───────────────────────────────────────────────
    -- NULL / '{}' for office bookings (no addons model for office yet).
    addons_snapshot JSONB DEFAULT '{}',

    -- ── Notes ────────────────────────────────────────────────────────────────
    -- Residential: JSON { instructions, hasPets, petDetails }
    -- Office: free-text access instructions, key handover notes, etc.
    -- Safe to migrate to JSONB later:
    --   ALTER COLUMN special_notes TYPE JSONB USING special_notes::jsonb
    special_notes TEXT,

    -- ── Office-specific columns ───────────────────────────────────────────────
    -- All nullable — NULL means "not an office booking".
    -- Skipped for MVP (add later if needed): workspace_type, staff_count, pricing_tier

    -- Business name of the office client
    office_name               TEXT,
    -- Total office area — drives scope and pricing calculation
    office_size_sqm           INTEGER,
    -- Hours of cleaning per week agreed with the client
    weekly_hours              DECIMAL(5,2),
    -- Agreed hourly rate incl. VAT — snapshot at booking time
    hourly_rate               DECIMAL(10,2),
    -- Default start time for recurring sessions (mirrors time_slot on first visit)
    recurring_time            TIME,
    -- True when +15% evening/weekend surcharge applies
    evening_weekend_surcharge BOOLEAN DEFAULT false,
    -- weekly_hours × hourly_rate × 4.33 — used for Stripe subscription amount
    monthly_estimate          DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id  ON bookings(customer_id);
CREATE INDEX idx_bookings_date         ON bookings(booking_date);
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_service_type ON bookings(service_type);

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

-- Guest INSERT via service role in server actions — no policy needed

CREATE POLICY "Admins can manage all bookings"
    ON bookings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 7. OFFICE_SCHEDULE_RULES TABLE (Recurring Office Cleaning Pattern)
-- ============================================================================
-- WHY this table exists:
--   bookings.booking_date is a single DATE — correct for one-off residential visits.
--   An office contract is a recurring weekly PATTERN, e.g.:
--     Mon 2h + Wed 4h + Fri 4h = 10 hrs/week
--   That's 3 rows here, all linked to one bookings row.
--
--   bookings row  = the contract (client, address, price, Stripe subscription)
--   rules rows    = the weekly repeat pattern (which days, what time, how long)
--
-- Each row means: "every [day_of_week] at [start_time] for [duration_hours]"
--
-- day_of_week: 0=Sunday, 1=Monday … 6=Saturday (matches JS Date.getDay())
-- is_active: pause a specific day without deleting the rule
--   e.g. client temporarily drops Wednesdays → set is_active=false, keep the row
-- UNIQUE(booking_id, day_of_week): prevents two Monday rules for the same booking
-- ============================================================================

CREATE TABLE office_schedule_rules (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    day_of_week    INTEGER      NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time     TIME         NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL CHECK (duration_hours > 0),
    -- Pause a day without losing the rule
    is_active      BOOLEAN      DEFAULT true,
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  DEFAULT NOW(),
    -- One rule per day per booking
    CONSTRAINT uq_booking_day UNIQUE (booking_id, day_of_week)
);

-- "Give me all schedule rules for this booking"
CREATE INDEX idx_office_schedule_booking_id ON office_schedule_rules(booking_id);
-- "What's scheduled on Mondays across all clients" (admin calendar)
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
-- 8. BOOKING_EXTRAS TABLE (Residential Add-on Services)
-- ============================================================================
-- Each addon type gets its own row for admin reporting/analytics.
-- addons_snapshot on bookings is for fast reads; this table is for queries
-- like "how many oven cleans did we do this month?"
-- Not used for office bookings (no addons model for office at MVP).
-- ============================================================================

CREATE TABLE booking_extras (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    extra_type TEXT NOT NULL CHECK (
        extra_type IN ('windows', 'oven', 'fridge', 'deep_clean', 'high_dust')
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
-- 9. QUOTE_REQUESTS TABLE (Lead Generation)
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
-- 10. AVAILABILITY_SLOTS TABLE
-- ============================================================================
-- Used for residential booking slot checking.
-- Office bookings do not use this table — their schedule lives in
-- office_schedule_rules and is managed by the admin directly.
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
-- 11. CUSTOMER_PAYMENT_METHODS TABLE
-- ============================================================================
-- customer_id → customers.id (not profiles — guest-safe).
-- Allows authenticated customers to save payment methods after onboarding.
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 12. HELPER FUNCTIONS (Residential Slot Availability)
-- ============================================================================
-- These functions apply to residential bookings only.
-- Office schedule conflicts are handled at the application layer using
-- office_schedule_rules directly.
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
-- 13. AUTH UPGRADE FUNCTIONS
-- ============================================================================
-- When a guest later creates an account with the same email,
-- their customer record is automatically linked to their new auth user.
-- Booking history is preserved — no duplicate rows, no data loss.
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
    WHERE email = p_email
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE customers
    SET auth_user_id = p_auth_user_id,
        updated_at   = NOW()
    WHERE id          = v_customer_id
      AND auth_user_id IS NULL;  -- safety: never overwrite an existing link

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fires automatically when a new Supabase Auth user is created.
-- If a customer row with the same email already exists (prior guest booking),
-- it is linked immediately — no manual step required.
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
-- 14. ADMIN VIEWS
-- ============================================================================

-- ── Residential upcoming bookings (admin calendar) ────────────────────────
CREATE VIEW v_admin_upcoming_bookings AS
SELECT
    b.id,
    b.booking_date,
    b.time_slot,
    b.status,
    b.payment_status,
    c.full_name    AS customer_name,
    c.email        AS customer_email,
    c.phone        AS customer_phone,
    s.name         AS service_name,
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

-- ── Office bookings (admin contract view) ────────────────────────────────
-- Includes the aggregated weekly schedule for quick display.
CREATE VIEW v_office_bookings AS
SELECT
    b.id,
    b.booking_date       AS contract_start_date,
    b.status,
    b.payment_status,
    b.frequency,
    -- Office contract fields
    b.office_name,
    b.office_size_sqm,
    b.weekly_hours,
    b.hourly_rate,
    b.monthly_estimate,
    b.evening_weekend_surcharge,
    -- Customer
    c.full_name          AS customer_name,
    c.email              AS customer_email,
    c.phone              AS customer_phone,
    (c.auth_user_id IS NOT NULL) AS is_authenticated,
    -- Service
    s.name               AS service_name,
    -- Address
    a.street_address || ', ' || a.city AS address,
    -- Weekly pattern aggregated for quick display
    -- Shape: [{ "day": 1, "start": "08:00:00", "duration": 3.0 }, …]
    (
        SELECT json_agg(
            json_build_object(
                'day',      osr.day_of_week,
                'start',    osr.start_time,
                'duration', osr.duration_hours
            ) ORDER BY osr.day_of_week
        )
        FROM office_schedule_rules osr
        WHERE osr.booking_id = b.id
          AND osr.is_active  = true
    ) AS schedule_rules,
    b.special_notes,
    b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services  s ON b.service_id  = s.id
JOIN addresses a ON b.address_id  = a.id
WHERE b.service_type = 'office'
ORDER BY b.created_at DESC;

-- ── Customer list with booking stats ─────────────────────────────────────
CREATE VIEW v_customer_list AS
SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    (c.auth_user_id IS NOT NULL) AS has_account,
    COUNT(DISTINCT b.id)          AS total_bookings,
    MAX(b.booking_date)           AS last_booking_date,
    SUM(b.final_price)            AS total_spent,
    CASE
        WHEN COUNT(b.id) FILTER (WHERE b.frequency != 'one-time') > 0
        THEN 'Subscriber'
        ELSE 'One-time'
    END AS customer_type,
    c.created_at AS joined_date
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
GROUP BY c.id, c.full_name, c.email, c.phone, c.auth_user_id, c.created_at
ORDER BY c.created_at DESC;


-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Admin user: create in Supabase Auth dashboard first, then run:
-- INSERT INTO profiles (id, full_name, phone, role)
-- VALUES ('YOUR_AUTH_USER_ID', 'Admin User', '+358123456789', 'admin');

-- ============================================================================
-- EXAMPLE: Office booking insert pattern
-- ============================================================================

-- Step 1 — insert the customer (or reuse existing):
-- INSERT INTO customers (email, full_name, phone)
-- VALUES ('contact@acmeoy.fi', 'Acme Oy', '+358401234567')
-- ON CONFLICT (email) DO NOTHING;

-- Step 2 — insert the address:
-- INSERT INTO addresses (customer_id, street_address, city, postal_code, square_meters, number_of_rooms)
-- VALUES (<customer_id>, 'Hämeenkatu 1', 'Tampere', '33100', 250, 10);

-- Step 3 — insert the booking (contract row):
-- INSERT INTO bookings (
--   customer_id, service_id, address_id,
--   booking_date, time_slot, frequency, status,
--   final_price, service_type,
--   office_name, office_size_sqm,
--   weekly_hours, hourly_rate, recurring_time,
--   evening_weekend_surcharge, monthly_estimate
-- ) VALUES (
--   <customer_id>, <office_service_id>, <address_id>,
--   '2026-06-02', '08:00', 'weekly', 'confirmed',
--   97.50,        -- first visit: 3h × 32.50
--   'office',
--   'Acme Oy', 250,
--   10.00, 32.50, '08:00',
--   false,
--   1407.25       -- 10 × 32.50 × 4.33
-- );

-- Step 4 — insert the recurring schedule rules (Mon 3h, Wed 3h, Fri 4h):
-- INSERT INTO office_schedule_rules (booking_id, day_of_week, start_time, duration_hours)
-- VALUES
--   (<booking_id>, 1, '08:00', 3.0),   -- Monday
--   (<booking_id>, 3, '08:00', 3.0),   -- Wednesday
--   (<booking_id>, 5, '08:00', 4.0);   -- Friday

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
