-- Add guest support to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ DEFAULT now();

-- Create table for QR tokens
CREATE TABLE IF NOT EXISTS table_qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
    used BOOLEAN DEFAULT false
);

-- RLS for table_qr_tokens
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read table_qr_tokens"
ON table_qr_tokens FOR SELECT
TO authenticated
USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Allow authenticated users to insert table_qr_tokens"
ON table_qr_tokens FOR INSERT
TO authenticated
WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));

-- Also allow public access to check tokens (for the public app)
CREATE POLICY "Allow public access to read table_qr_tokens"
ON table_qr_tokens FOR SELECT
TO anon
USING (expires_at > now() AND used = false);
