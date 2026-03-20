-- Waitlist table for capturing interest during private beta
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on lowercase email to prevent duplicates
CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- No public access policies. Only service role (admin client) can read/write.
-- This table is accessed exclusively via server actions.
