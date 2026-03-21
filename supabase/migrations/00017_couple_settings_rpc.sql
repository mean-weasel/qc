-- RPC function for atomic JSONB merge on couples.settings
-- Prevents race conditions when multiple settings are updated concurrently

CREATE OR REPLACE FUNCTION public.update_couple_setting(
  p_couple_id UUID,
  p_key TEXT,
  p_value BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.couples
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(p_key, p_value)
  WHERE id = p_couple_id;
END;
$$;
