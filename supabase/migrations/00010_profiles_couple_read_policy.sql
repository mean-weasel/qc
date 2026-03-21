-- Allow users to read profiles of their couple partner.
-- The original 00001 migration only allows reading your OWN profile.
-- Many features (requests, love languages, etc.) need to query the partner's
-- profile to display their name and id.
--
-- We use a SECURITY DEFINER function to get the current user's couple_id
-- because referencing the profiles table in its own RLS policy would cause
-- a recursive evaluation issue in Postgres.

CREATE OR REPLACE FUNCTION public.get_my_couple_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT couple_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Users can read profiles in same couple"
  ON public.profiles
  FOR SELECT
  USING (
    couple_id IS NOT NULL
    AND couple_id = public.get_my_couple_id()
  );
