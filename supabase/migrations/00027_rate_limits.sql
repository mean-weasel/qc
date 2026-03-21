-- Rate limits table for Supabase-backed distributed rate limiting
-- Accessed exclusively via SECURITY DEFINER functions; no direct RLS policies needed.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (no policies -- access is via SECURITY DEFINER functions only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON public.rate_limits (expires_at);

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE expires_at <= now();
END;
$$;

-- Atomic upsert-based rate limit check.
-- Returns TRUE if the request is allowed (count <= p_max_requests), FALSE if rate limited.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start, expires_at)
  VALUES (p_key, 1, now(), now() + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN public.rate_limits.expires_at <= now() THEN 1 ELSE public.rate_limits.count + 1 END,
    window_start = CASE WHEN public.rate_limits.expires_at <= now() THEN now() ELSE public.rate_limits.window_start END,
    expires_at = CASE WHEN public.rate_limits.expires_at <= now() THEN now() + (p_window_seconds || ' seconds')::interval ELSE public.rate_limits.expires_at END
  RETURNING count <= p_max_requests INTO v_allowed;

  RETURN v_allowed;
END;
$$;

-- Prevent duplicate active check-in sessions per couple
-- Wrap in DO block to defer table resolution in Supabase CLI batch mode
DO $check_in_index$
BEGIN
  CREATE UNIQUE INDEX idx_check_ins_active_couple
  ON public.check_ins (couple_id)
  WHERE status = 'in-progress';
END;
$check_in_index$;
