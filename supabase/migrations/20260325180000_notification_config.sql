-- ============================================
-- Notification Configuration Table
-- Stores SMS, Email, and Push credentials per club
-- Keys are stored as text; use Supabase Vault or env secrets for production
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_config (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                     UUID          NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,

  -- SMS (Twilio)
  twilio_sid                  TEXT,
  twilio_token                TEXT,
  twilio_phone                TEXT,

  -- Email (SendGrid)
  sendgrid_api_key            TEXT,
  sendgrid_from_email         TEXT,

  -- Push (Firebase FCM)
  firebase_project_id         TEXT,
  firebase_service_account_json TEXT,

  updated_at                  TIMESTAMPTZ   DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

-- Club member can read and write their own club's notification config
-- (Access is via profiles.club_id which links auth.uid() → club)
CREATE POLICY "Club member can manage notification config"
  ON public.notification_config
  FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );
