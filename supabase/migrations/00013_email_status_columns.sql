-- Add email status tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN email_bounced_at TIMESTAMPTZ,
  ADD COLUMN email_complained_at TIMESTAMPTZ,
  ADD COLUMN email_unsubscribe_token TEXT DEFAULT gen_random_uuid()::text,
  ADD COLUMN email_opted_out_at TIMESTAMPTZ;

-- Backfill unsubscribe tokens for existing profiles
UPDATE public.profiles
  SET email_unsubscribe_token = gen_random_uuid()::text
  WHERE email_unsubscribe_token IS NULL;

-- Ensure unsubscribe tokens are unique
CREATE UNIQUE INDEX idx_profiles_unsubscribe_token ON public.profiles (email_unsubscribe_token);
