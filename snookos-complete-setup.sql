-- ============================================
-- Snook OS Unified Production Schema
-- Version: 2.1 (Complete Overhaul)
-- Description: One-click setup for a fresh Supabase project.
-- ============================================

-- --------------------------------------------
-- 1. CLEANUP / IDEMPOTENCY
-- --------------------------------------------
-- (Optional: Drop existing to ensure fresh start if needed, 
-- but we use IF NOT EXISTS for safety as requested)

-- --------------------------------------------
-- 2. CUSTOM TYPES & ENUMS
-- --------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.app_role          AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.table_status      AS ENUM ('free', 'occupied', 'paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.billing_mode      AS ENUM ('hourly', 'per_minute', 'per_frame');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.table_type        AS ENUM ('Snooker', 'Pool', '8-Ball');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.membership_type   AS ENUM ('Gold', 'Silver', 'Bronze', 'Regular', 'Guest');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.booking_status    AS ENUM ('confirmed', 'pending', 'cancelled', 'waitlisted', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.tournament_type   AS ENUM ('Snooker', '8-Ball', '9-Ball');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.item_category     AS ENUM ('drinks', 'snacks', 'meals');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.time_format       AS ENUM ('12h', '24h');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- --------------------------------------------
-- 3. CORE TABLES
-- --------------------------------------------

-- CLUBS (The Root Entity)
CREATE TABLE IF NOT EXISTS public.clubs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL DEFAULT 'Snook OS Club',
  logo_url         TEXT,
  settings         JSONB       NOT NULL DEFAULT '{
    "isOpen": true,
    "upiQrCode": "",
    "reminderTemplate": "Hi {name}, your pending amount at Snook OS is ₹{amount}. Please clear it soon. Thanks!",
    "showMembershipBadge": true,
    "gstEnabled": false,
    "gstRate": 18,
    "timeFormat": "12h",
    "timezone": "Asia/Kolkata",
    "autoStartBookings": true
  }'::jsonb,
  custom_branding  JSONB       DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id     UUID        REFERENCES public.clubs(id) ON DELETE SET NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      public.app_role    NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

-- MEMBERS (Players)
CREATE TABLE IF NOT EXISTS public.members (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID             NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name             TEXT             NOT NULL,
  avatar           TEXT,
  membership_type  public.membership_type  DEFAULT 'Regular',
  membership_tier  TEXT             DEFAULT 'Regular',
  points           INT              DEFAULT 0,
  cpp_points       INT              DEFAULT 0,
  loyalty_points   INT              DEFAULT 0,
  credit_balance   NUMERIC(10,2)    DEFAULT 0,
  last_visit       TIMESTAMPTZ      DEFAULT now(),
  games_played     INT              DEFAULT 0,
  wins             INT              DEFAULT 0,
  losses           INT              DEFAULT 0,
  phone            TEXT,
  email            TEXT,
  is_guest         BOOLEAN          DEFAULT false,
  trophies         JSONB            DEFAULT '[]'::jsonb,
  highest_break    INT              DEFAULT 0,
  created_at       TIMESTAMPTZ      DEFAULT now()
);

-- TABLES (Physical Config)
CREATE TABLE IF NOT EXISTS public.tables (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number        INT           NOT NULL,
  table_name          TEXT,
  table_type          public.table_type    DEFAULT 'Snooker',
  status              public.table_status  DEFAULT 'free',
  billing_mode        public.billing_mode  DEFAULT 'per_minute',
  use_global_pricing  BOOLEAN       DEFAULT true,
  custom_pricing      JSONB,
  image_url           TEXT,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (club_id, table_number)
);

-- TABLE PRICING (Global Rates)
CREATE TABLE IF NOT EXISTS public.table_pricing (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE UNIQUE,
  per_hour              NUMERIC(10,2) DEFAULT 200,
  per_minute            NUMERIC(10,2) DEFAULT 4,
  per_frame             NUMERIC(10,2) DEFAULT 50,
  peak_hour_rate        NUMERIC(10,2) DEFAULT 300,
  off_peak_rate         NUMERIC(10,2) DEFAULT 150,
  peak_hours_start      TEXT          DEFAULT '18:00',
  peak_hours_end        TEXT          DEFAULT '23:00',
  default_billing_mode  public.billing_mode  DEFAULT 'hourly'
);

-- SESSIONS (Active Table State)
CREATE TABLE IF NOT EXISTS public.sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id      UUID          NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  club_id       UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  players       TEXT[]        DEFAULT '{}',
  start_time    TIMESTAMPTZ,
  paused_time   BIGINT        DEFAULT 0,
  items         JSONB         DEFAULT '[]'::jsonb,
  total_bill    NUMERIC(10,2) DEFAULT 0,
  billing_mode  public.billing_mode  DEFAULT 'hourly',
  frame_count   INT           DEFAULT 0,
  is_active     BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

-- MATCH HISTORY (Permanent Records)
CREATE TABLE IF NOT EXISTS public.match_history (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number        INT           NOT NULL,
  players             JSONB         NOT NULL,
  date                TIMESTAMPTZ   DEFAULT now(),
  session_start_time  TIMESTAMPTZ,
  session_end_time    TIMESTAMPTZ,
  duration            BIGINT,
  billing_mode        public.billing_mode,
  total_bill          NUMERIC(10,2),
  payment_method      TEXT,
  split_count         INT           DEFAULT 1,
  qr_used             BOOLEAN       DEFAULT false,
  gst_amount          NUMERIC(10,2) DEFAULT 0,
  items               JSONB         DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ   DEFAULT now()
);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID               NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name                 TEXT               NOT NULL,
  type                 public.tournament_type    DEFAULT 'Snooker',
  date                 TIMESTAMPTZ        NOT NULL,
  start_time           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  location             TEXT,
  entry_fee            NUMERIC(10,2)      DEFAULT 0,
  prize_pool           NUMERIC(10,2),
  prize_distribution   JSONB,
  max_players          INT                DEFAULT 16,
  registered_players   TEXT[]             DEFAULT '{}',
  waitlist             TEXT[]             DEFAULT '{}',
  status               public.tournament_status  DEFAULT 'upcoming',
  description          TEXT,
  tables               INT[],
  image                TEXT,
  winner               TEXT,
  trophies             JSONB              DEFAULT '{}'::jsonb,
  bracket              JSONB              DEFAULT '[]'::jsonb,
  default_best_of      INT                DEFAULT 7,
  created_at           TIMESTAMPTZ        DEFAULT now()
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID            NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number     INT             NOT NULL,
  customer_name    TEXT            NOT NULL,
  phone            TEXT,
  date             DATE            NOT NULL,
  start_time       TEXT            NOT NULL,
  end_time         TEXT            NOT NULL,
  status           public.booking_status  DEFAULT 'pending',
  advance_payment  NUMERIC(10,2)   DEFAULT 0,
  discount         NUMERIC(10,2)   DEFAULT 0,
  note             TEXT,
  created_at       TIMESTAMPTZ     DEFAULT now()
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID           NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL,
  category    public.item_category  NOT NULL,
  icon        TEXT           DEFAULT '📦',
  stock       INT            DEFAULT 0,
  created_at  TIMESTAMPTZ    DEFAULT now()
);

-- PROMOTIONS
CREATE TABLE IF NOT EXISTS public.promotions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID         NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  description      TEXT,
  message          TEXT,
  audience         TEXT         DEFAULT 'All Members',
  channel          TEXT         DEFAULT 'SMS',
  discount_percent INT,
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ  DEFAULT now(),
  is_active        BOOLEAN      DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT now()
);

-- PROMOTION TEMPLATES
CREATE TABLE IF NOT EXISTS public.promotion_templates (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID    NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  audience    TEXT    DEFAULT 'All Members',
  channel     TEXT    DEFAULT 'SMS',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- CAMERAS
CREATE TABLE IF NOT EXISTS public.cameras (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID         NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  url         TEXT         NOT NULL,
  status      TEXT         DEFAULT 'offline',
  thumbnail   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- FCM TOKENS
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL,
  device_type TEXT    DEFAULT 'web',
  club_id     UUID    NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);

-- QR TOKENS
CREATE TABLE IF NOT EXISTS public.table_qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
    used BOOLEAN DEFAULT false
);

-- NOTIFICATION CONFIG
CREATE TABLE IF NOT EXISTS public.notification_config (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                     UUID          NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  twilio_sid                  TEXT,
  twilio_token                TEXT,
  twilio_phone                TEXT,
  sendgrid_api_key            TEXT,
  sendgrid_from_email         TEXT,
  firebase_project_id         TEXT,
  firebase_service_account_json TEXT,
  updated_at                  TIMESTAMPTZ   DEFAULT now()
);

-- --------------------------------------------
-- 4. SECURITY & RLS
-- --------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_pricing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

-- Security Definer Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_club_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- RLS POLICIES

-- Clubs: Users see own, Admins manage
CREATE POLICY "Users can view their club" ON public.clubs FOR SELECT TO authenticated USING (id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins can manage club" ON public.clubs FOR ALL TO authenticated USING (id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
-- Allow club creation for users with no club linked (initial setup)
CREATE POLICY "Allow club creation" ON public.clubs FOR INSERT TO authenticated WITH CHECK (public.get_user_club_id(auth.uid()) IS NULL);

-- Profiles
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Members, Tables, Sessions, History... (Staff view/edit, Admin delete)
-- Generic approach for club-scoped data:
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('members', 'tables', 'sessions', 'match_history', 'tournaments', 'bookings', 'inventory', 'promotions', 'promotion_templates', 'cameras')
  LOOP
    EXECUTE format('CREATE POLICY "Staff manage %I" ON public.%I FOR ALL TO authenticated USING (club_id = public.get_user_club_id(auth.uid())) WITH CHECK (club_id = public.get_user_club_id(auth.uid()))', tbl, tbl);
  END LOOP;
END $$;

-- Notification Config (Fixed)
CREATE POLICY "Manage notification config" ON public.notification_config FOR ALL TO authenticated 
USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));

-- QR Tokens (Public Access)
CREATE POLICY "Staff manage QR" ON public.table_qr_tokens FOR ALL TO authenticated USING (club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Public read QR" ON public.table_qr_tokens FOR SELECT TO anon USING (expires_at > now() AND used = false);

-- Bookings (Public Access for /book page)
CREATE POLICY "Public read booking" ON public.bookings FOR SELECT TO anon USING (status != 'cancelled');

-- FCM Tokens
CREATE POLICY "User manage FCM" ON public.fcm_tokens FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff read FCM" ON public.fcm_tokens FOR SELECT TO authenticated USING (club_id = public.get_user_club_id(auth.uid()));

-- --------------------------------------------
-- 5. TRIGGERS & HOOKS
-- --------------------------------------------

-- Profile + Role creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New Member'));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------
-- 6. REALTIME PUBLICATION
-- --------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.tables, 
    public.sessions, 
    public.tournaments, 
    public.match_history, 
    public.promotions,
    public.bookings,
    public.members;
COMMIT;

-- --------------------------------------------
-- 7. REFRESH SCHEMA
-- --------------------------------------------
NOTIFY pgrst, 'reload schema';
