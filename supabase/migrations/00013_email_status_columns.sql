-- Add email status tracking columns to profiles
-- Wrap in DO block to defer table resolution in Supabase CLI batch mode
DO $email_status$
BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN email_bounced_at TIMESTAMPTZ,
    ADD COLUMN email_complained_at TIMESTAMPTZ,
    ADD COLUMN email_unsubscribe_token TEXT DEFAULT gen_random_uuid()::text,
    ADD COLUMN email_opted_out_at TIMESTAMPTZ;

  UPDATE public.profiles
    SET email_unsubscribe_token = gen_random_uuid()::text
    WHERE email_unsubscribe_token IS NULL;

  CREATE UNIQUE INDEX idx_profiles_unsubscribe_token ON public.profiles (email_unsubscribe_token);
END;
$email_status$;
