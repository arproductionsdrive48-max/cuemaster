-- Add missing tournament columns required by the new Premium Redesign
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS waitlist text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS bracket jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS end_date timestamptz,
ADD COLUMN IF NOT EXISTS start_time text,
ADD COLUMN IF NOT EXISTS prize_pool numeric,
ADD COLUMN IF NOT EXISTS prize_distribution jsonb,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS tables integer[],
ADD COLUMN IF NOT EXISTS image text,
ADD COLUMN IF NOT EXISTS winner text,
ADD COLUMN IF NOT EXISTS trophies jsonb;
