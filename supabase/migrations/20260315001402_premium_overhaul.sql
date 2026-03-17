-- =============================================================================
-- Premium App Overhaul
-- 1. Adds CPP Points, Membership Tier, and Loyalty logic to `members`
-- 2. Adds target Jsonb column for `custom_branding` on `clubs`
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Upgrade `members` table
-- -----------------------------------------------------------------------------
-- Add cpp_points (Club Performance Points, replacing CGR)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS cpp_points integer DEFAULT 0 NOT NULL;

-- Ensure membership_tier defaults string type (Gold, Silver, Regular)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS membership_tier text DEFAULT 'Regular' NOT NULL;

-- Loyalty Points tracking for rewards
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0 NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Upgrade `clubs` table
-- -----------------------------------------------------------------------------
-- Add custom_branding jsonb array for One-Time Setup features
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS custom_branding jsonb DEFAULT '{}'::jsonb;

-- Note: All references to 'owner_id' have been purged. Access to clubs is 
-- mapped via 'profiles.club_id'. No complex RLS overrides required here.
