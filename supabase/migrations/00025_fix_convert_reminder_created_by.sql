-- Fix: convert_request_to_reminder was missing required columns in INSERT
-- Missing: created_by (NOT NULL), scheduled_for (NOT NULL), category (NOT NULL)

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
