-- Security hardening: add auth.uid() guards to SECURITY DEFINER RPC functions.
-- auth.uid() can be NULL in Next.js server actions on Vercel, so guards use
-- IS NOT NULL AND != to only block when auth context IS present but mismatched.

-- 1. create_couple_for_user: reject if caller is authenticated as a different user
CREATE OR REPLACE FUNCTION public.create_couple_for_user(p_user_id UUID, p_couple_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_couple_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot create couple for another user';
  END IF;

  INSERT INTO public.couples (name)
  VALUES (p_couple_name)
  RETURNING id INTO v_couple_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id
  WHERE id = p_user_id;

  RETURN v_couple_id;
END;
$$;

-- 2. update_couple_setting: reject if caller is authenticated but not a member of the couple
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
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND couple_id = p_couple_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you do not belong to this couple';
  END IF;

  UPDATE public.couples
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(p_key, p_value)
  WHERE id = p_couple_id;
END;
$$;

-- 3. convert_request_to_reminder: reject if caller is authenticated but not a member of the couple
CREATE OR REPLACE FUNCTION public.convert_request_to_reminder(
  p_request_id UUID,
  p_couple_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_reminder_id UUID;
  v_scheduled_for TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND couple_id = p_couple_id
  ) THEN
    RETURN json_build_object('error', 'Unauthorized: you do not belong to this couple');
  END IF;

  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = p_request_id AND couple_id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Request not found');
  END IF;

  IF v_request.status != 'accepted' THEN
    RETURN json_build_object('error', 'Only accepted requests can be converted');
  END IF;

  IF v_request.converted_to_reminder_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Request has already been converted');
  END IF;

  -- Use the request's suggested_date if available, otherwise default to tomorrow
  v_scheduled_for := COALESCE(v_request.suggested_date, now() + interval '1 day');

  -- Create the reminder with all required NOT NULL columns
  INSERT INTO public.reminders (
    couple_id, created_by, title, message, category, frequency,
    scheduled_for, is_active, converted_from_request_id
  )
  VALUES (
    p_couple_id, p_user_id, v_request.title, v_request.description, 'custom', 'once',
    v_scheduled_for, true, p_request_id
  )
  RETURNING id INTO v_reminder_id;

  -- Update the request
  UPDATE public.requests
  SET status = 'converted', converted_to_reminder_id = v_reminder_id
  WHERE id = p_request_id;

  -- Return the reminder id
  RETURN json_build_object('reminder_id', v_reminder_id);
END;
$$;
