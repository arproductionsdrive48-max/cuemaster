-- ============================================
-- Snook OS Database Schema v2
-- Reflects all app features as of latest update
-- Run this in your Supabase SQL Editor (fresh setup)
-- ============================================

-- ============================================
-- 1. Custom ENUM Types
-- ============================================
CREATE TYPE public.app_role          AS ENUM ('admin', 'staff');
CREATE TYPE public.table_status      AS ENUM ('free', 'occupied', 'paused');
CREATE TYPE public.billing_mode      AS ENUM ('hourly', 'per_minute', 'per_frame');
CREATE TYPE public.table_type        AS ENUM ('Snooker', 'Pool', '8-Ball');
CREATE TYPE public.membership_type   AS ENUM ('Gold', 'Silver', 'Bronze', 'Regular', 'Guest');
CREATE TYPE public.booking_status    AS ENUM ('confirmed', 'pending', 'cancelled');
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'in_progress', 'completed');
CREATE TYPE public.tournament_type   AS ENUM ('Snooker', '8-Ball', '9-Ball');
CREATE TYPE public.item_category     AS ENUM ('drinks', 'snacks', 'meals');
CREATE TYPE public.time_format       AS ENUM ('12h', '24h');

-- ============================================
-- 2. Clubs
-- Stores one record per club with all global settings as JSONB.
-- Settings includes: isOpen, upiQrCode, reminderTemplate,
-- showMembershipBadge, gstEnabled, gstRate, timeFormat, timezone, clubLogo
-- ============================================
CREATE TABLE public.clubs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL DEFAULT 'CueMaster Club',
  logo_url    TEXT,
  settings    JSONB       NOT NULL DEFAULT '{
    "isOpen": true,
    "upiQrCode": "",
    "reminderTemplate": "Hi {name}, your pending amount at CueMaster is ₹{amount}. Please clear it soon. Thanks!",
    "showMembershipBadge": true,
    "gstEnabled": false,
    "gstRate": 18,
    "timeFormat": "12h",
    "timezone": "Asia/Kolkata"
  }'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Profiles (linked to auth.users)
-- One profile per authenticated user. club_id links them to a club.
-- ============================================
CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id     UUID        REFERENCES public.clubs(id) ON DELETE SET NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. User Roles  (NEVER store roles on profiles — privilege escalation risk)
-- ============================================
CREATE TABLE public.user_roles (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      app_role    NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

-- ============================================
-- 5. Members (players registered at the club)
-- ============================================
CREATE TABLE public.members (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID             NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name             TEXT             NOT NULL,
  avatar           TEXT,                         -- initials e.g. "RS"
  membership_type  membership_type  DEFAULT 'Regular',
  credit_balance   NUMERIC(10,2)    DEFAULT 0,   -- negative = due, positive = credit
  last_visit       TIMESTAMPTZ      DEFAULT now(),
  games_played     INT              DEFAULT 0,
  wins             INT              DEFAULT 0,
  losses           INT              DEFAULT 0,
  phone            TEXT,                         -- stored as entered; normalized when sending WhatsApp
  email            TEXT,
  is_guest         BOOLEAN          DEFAULT false,
  -- Trophy records awarded on tournament completion
  -- JSONB array of {tournamentName, position, trophyLabel}
  trophies         JSONB            DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ      DEFAULT now()
);

-- ============================================
-- 6. Tables (physical snooker/pool tables)
-- custom_pricing: {perHour, perMinute, perFrame, peakHourRate}
-- individual_pricing: full IndividualTablePricing[] array stored per club
--   (mirrors app state so the whole list is sync'd in one write)
-- ============================================
CREATE TABLE public.tables (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number        INT           NOT NULL,
  table_name          TEXT,
  table_type          table_type    DEFAULT 'Snooker',
  status              table_status  DEFAULT 'free',
  billing_mode        billing_mode  DEFAULT 'hourly',
  use_global_pricing  BOOLEAN       DEFAULT true,
  custom_pricing      JSONB,        -- {perHour, perMinute, perFrame, peakHourRate}
  image_url           TEXT,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (club_id, table_number)
);

-- ============================================
-- 7. Table Pricing (global rates per club)
-- ============================================
CREATE TABLE public.table_pricing (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE UNIQUE,
  per_hour              NUMERIC(10,2) DEFAULT 200,
  per_minute            NUMERIC(10,2) DEFAULT 4,
  per_frame             NUMERIC(10,2) DEFAULT 50,
  peak_hour_rate        NUMERIC(10,2) DEFAULT 300,
  off_peak_rate         NUMERIC(10,2) DEFAULT 150,
  peak_hours_start      TEXT          DEFAULT '18:00',
  peak_hours_end        TEXT          DEFAULT '23:00',
  default_billing_mode  billing_mode  DEFAULT 'hourly'
);

-- ============================================
-- 8. Sessions (active table sessions)
-- players: text[] of player names for the session
-- items: JSONB [{id, name, price, quantity}]
-- ============================================
CREATE TABLE public.sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id      UUID          NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  club_id       UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  players       TEXT[]        DEFAULT '{}',
  start_time    TIMESTAMPTZ,
  paused_time   BIGINT        DEFAULT 0,      -- accumulated paused ms
  items         JSONB         DEFAULT '[]'::jsonb,
  total_bill    NUMERIC(10,2) DEFAULT 0,
  billing_mode  billing_mode  DEFAULT 'hourly',
  frame_count   INT           DEFAULT 0,
  is_active     BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

-- ============================================
-- 9. Match History
-- players: [{name, result: 'win'|'loss'|'draw'}]
-- payment_method: 'cash'|'upi'|'card'|'split'
-- ============================================
CREATE TABLE public.match_history (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID          NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number        INT           NOT NULL,
  players             JSONB         NOT NULL,  -- [{name, result}]
  date                TIMESTAMPTZ   DEFAULT now(),
  session_start_time  TIMESTAMPTZ,
  session_end_time    TIMESTAMPTZ,
  duration            BIGINT,                  -- ms
  billing_mode        billing_mode,
  total_bill          NUMERIC(10,2),
  payment_method      TEXT,
  split_count         INT           DEFAULT 1,
  qr_used             BOOLEAN       DEFAULT false,
  gst_amount          NUMERIC(10,2) DEFAULT 0,
  items               JSONB         DEFAULT '[]'::jsonb,  -- [{id, name, price, quantity}]
  created_at          TIMESTAMPTZ   DEFAULT now()
);

-- ============================================
-- 10. Tournaments
-- bracket: persisted JSONB array of TournamentBracketMatch[]
--   Each match: {id, round, matchNumber, player1, player2,
--                score1, score2, bestOf, tableNumber, status, winner}
-- prize_distribution: [{place, amount}]
-- trophies: {playerName: [trophyLabel, ...], ...}  — awarded on completion
-- default_best_of: default bestOf for new matches in this tournament
-- ============================================
CREATE TABLE public.tournaments (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID               NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name                 TEXT               NOT NULL,
  type                 tournament_type    DEFAULT 'Snooker',
  date                 TIMESTAMPTZ        NOT NULL,
  start_time           TEXT,              -- e.g. "14:00"
  location             TEXT,
  entry_fee            NUMERIC(10,2)      DEFAULT 0,
  prize_pool           NUMERIC(10,2),
  prize_distribution   JSONB,             -- [{place, amount}]
  max_players          INT                DEFAULT 16,
  registered_players   TEXT[]             DEFAULT '{}',
  status               tournament_status  DEFAULT 'upcoming',
  description          TEXT,
  tables               INT[],             -- table numbers used
  image                TEXT,
  default_best_of      INT                DEFAULT 7,  -- default bestOf for bracket matches
  bracket              JSONB              DEFAULT '[]'::jsonb, -- TournamentBracketMatch[]
  winner               TEXT,             -- champion name on completion
  trophies             JSONB              DEFAULT '{}'::jsonb, -- {playerName: [label]}
  created_at           TIMESTAMPTZ        DEFAULT now()
);

-- ============================================
-- 11. Bookings
-- ============================================
CREATE TABLE public.bookings (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID            NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  table_number     INT             NOT NULL,
  customer_name    TEXT            NOT NULL,
  date             DATE            NOT NULL,
  start_time       TEXT            NOT NULL,
  end_time         TEXT            NOT NULL,
  status           booking_status  DEFAULT 'pending',
  advance_payment  NUMERIC(10,2)   DEFAULT 0,
  created_at       TIMESTAMPTZ     DEFAULT now()
);

-- ============================================
-- 12. Inventory
-- ============================================
CREATE TABLE public.inventory (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID           NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL,
  category    item_category  NOT NULL,
  icon        TEXT           DEFAULT '📦',
  stock       INT            DEFAULT 0,
  created_at  TIMESTAMPTZ    DEFAULT now()
);

-- ============================================
-- 13. Promotions
-- ============================================
CREATE TABLE public.promotions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID         NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  description      TEXT,        -- human-readable summary / legacy field
  message          TEXT,        -- full promotion message body
  audience         TEXT,        -- e.g. 'All Members', 'Gold Members', 'Guests'
  channel          TEXT,        -- e.g. 'SMS', 'EMAIL', 'WHATSAPP'
  discount_percent INT,
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ  DEFAULT now(),
  is_active        BOOLEAN      DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT now()
);

-- ============================================
-- 14. Cameras (CCTV)
-- ============================================
CREATE TABLE public.cameras (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID         NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  url         TEXT         NOT NULL,
  status      TEXT         DEFAULT 'offline',
  thumbnail   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ============================================
-- Enable Row Level Security on all tables
-- ============================================
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
ALTER TABLE public.cameras        ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Security Definer Helper Functions
-- These run with owner privileges to avoid RLS recursion.
-- ============================================

-- Check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get the club_id for the calling user
CREATE OR REPLACE FUNCTION public.get_user_club_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT club_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ============================================
-- RLS Policies
-- ============================================

-- ── Clubs ──
CREATE POLICY "Users can view their club"
  ON public.clubs FOR SELECT TO authenticated
  USING (id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can insert a club"
  ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update their club"
  ON public.clubs FOR UPDATE TO authenticated
  USING (id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Profiles ──
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── User Roles ──
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Members ──
CREATE POLICY "Staff can view club members"
  ON public.members FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert club members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update club members"
  ON public.members FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete club members"
  ON public.members FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Tables ──
CREATE POLICY "Staff can view tables"
  ON public.tables FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert tables"
  ON public.tables FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update tables"
  ON public.tables FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete tables"
  ON public.tables FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Table Pricing ──
CREATE POLICY "Staff can view pricing"
  ON public.table_pricing FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can manage pricing"
  ON public.table_pricing FOR ALL TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Sessions ──
CREATE POLICY "Staff can view sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can delete sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

-- ── Match History ──
CREATE POLICY "Staff can view match history"
  ON public.match_history FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert match history"
  ON public.match_history FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

-- match_history is intentionally immutable after creation (no UPDATE policy).
-- Corrections should be done via DELETE + INSERT by admins.
-- If edits are ever needed, add:
-- CREATE POLICY "Admins can update match history"
--   ON public.match_history FOR UPDATE TO authenticated
--   USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete match history"
  ON public.match_history FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Tournaments ──
CREATE POLICY "Staff can view tournaments"
  ON public.tournaments FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete tournaments"
  ON public.tournaments FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Bookings ──
CREATE POLICY "Staff can view bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Inventory ──
CREATE POLICY "Staff can view inventory"
  ON public.inventory FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert inventory"
  ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update inventory"
  ON public.inventory FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete inventory"
  ON public.inventory FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Promotions ──
CREATE POLICY "Staff can view promotions"
  ON public.promotions FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert promotions"
  ON public.promotions FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update promotions"
  ON public.promotions FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete promotions"
  ON public.promotions FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ── Cameras ──
CREATE POLICY "Staff can view cameras"
  ON public.cameras FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can manage cameras"
  ON public.cameras FOR ALL TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Triggers
-- ============================================

-- Auto-create a profile (and assign 'staff' role) on new user signup.
-- Admins should manually update user_roles to 'admin' in Supabase dashboard.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_name TEXT;
BEGIN
  -- Sanitize full_name: strip control characters, limit to 100 chars
  clean_name := TRIM(BOTH FROM COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  clean_name := REGEXP_REPLACE(clean_name, '[[:cntrl:]]', '', 'g');
  clean_name := SUBSTRING(clean_name FROM 1 FOR 100);

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NULLIF(clean_name, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign staff role; admins must be promoted manually in dashboard
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 15. Promotion Templates
-- ============================================
CREATE TABLE public.promotion_templates (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID    NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  audience    TEXT    DEFAULT 'All Members',
  channel     TEXT    DEFAULT 'SMS',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promotion_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view promotion templates"
  ON public.promotion_templates FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can insert promotion templates"
  ON public.promotion_templates FOR INSERT TO authenticated
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Staff can update promotion templates"
  ON public.promotion_templates FOR UPDATE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

CREATE POLICY "Admins can delete promotion templates"
  ON public.promotion_templates FOR DELETE TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 16. FCM Tokens (Firebase Cloud Messaging)
-- ============================================
CREATE TABLE public.fcm_tokens (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL,
  device_type TEXT    DEFAULT 'web',
  club_id     UUID    NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own FCM tokens"
  ON public.fcm_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own FCM tokens"
  ON public.fcm_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own FCM tokens"
  ON public.fcm_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Staff can read all tokens in their club (for push sending)
CREATE POLICY "Staff can view club FCM tokens"
  ON public.fcm_tokens FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));

-- ============================================
-- Realtime subscriptions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotion_templates;
