-- =============================================================================
-- Fix Bookings & CPP Enhancements
-- 1. Add missing columns to bookings (discount, advance_payment, note)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Upgrade `bookings` table
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS advance_payment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS note text;

-- CPP points were already added to members in 20260315001402_premium_overhaul.sql
-- So we only need to patch bookings here!
