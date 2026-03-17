-- Add tier and points to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Regular' NOT NULL,
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0 NOT NULL;