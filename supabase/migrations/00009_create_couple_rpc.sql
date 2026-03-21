-- SECURITY DEFINER function for couple creation during onboarding.
-- auth.uid() may be NULL in Next.js server actions on Vercel,
-- so we bypass RLS by using a trusted function that accepts user_id as a parameter.
CREATE OR REPLACE FUNCTION public.create_couple_for_user(p_user_id UUID, p_couple_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_couple_id UUID;
BEGIN
  INSERT INTO public.couples (name)
  VALUES (p_couple_name)
  RETURNING id INTO v_couple_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id
  WHERE id = p_user_id;

  RETURN v_couple_id;
END;
$$;
