-- WT-4 Code Review Fix: Atomic request-to-reminder conversion
-- CRITICAL-1: Replace two-step DB operations with single RPC transaction

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
  v_result JSON;
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

  -- Create the reminder
  INSERT INTO public.reminders (couple_id, title, message, frequency, is_active, converted_from_request_id)
  VALUES (p_couple_id, v_request.title, v_request.description, 'once', true, p_request_id)
  RETURNING id INTO v_reminder_id;

  -- Update the request
  UPDATE public.requests
  SET status = 'converted', converted_to_reminder_id = v_reminder_id
  WHERE id = p_request_id;

  -- Return the reminder id
  RETURN json_build_object('reminder_id', v_reminder_id);
END;
$$;
