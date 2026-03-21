-- Dashboard summary RPC: consolidates 11 individual queries into 1 round trip
-- Kept separate: getStreakData() (JS week calc) and getRecentActivity() (multi-table union)

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_couple_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
  v_couple_id UUID;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
BEGIN
  -- Verify caller belongs to the couple
  SELECT p.couple_id INTO v_couple_id
  FROM public.profiles p
  WHERE p.id = p_user_id AND p.couple_id = p_couple_id;

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not belong to this couple';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_today_end := v_today_start + interval '1 day';

  SELECT json_build_object(
    'check_in_count', (
      SELECT count(*) FROM public.check_ins WHERE couple_id = p_couple_id
    ),
    'note_count', (
      SELECT count(*) FROM public.notes WHERE couple_id = p_couple_id
    ),
    'milestone_count', (
      SELECT count(*) FROM public.milestones WHERE couple_id = p_couple_id
    ),
    'action_item_count', (
      SELECT count(*) FROM public.action_items
      WHERE couple_id = p_couple_id AND completed = false
    ),
    'total_languages', (
      SELECT count(*) FROM public.love_languages WHERE couple_id = p_couple_id
    ),
    'shared_languages', (
      SELECT count(*) FROM public.love_languages
      WHERE couple_id = p_couple_id AND privacy = 'shared'
    ),
    'today_action_count', (
      SELECT count(*) FROM public.love_actions WHERE couple_id = p_couple_id
    ),
    'relationship_start_date', (
      SELECT c.relationship_start_date FROM public.couples c WHERE c.id = p_couple_id
    ),
    'frequency_goal', (
      SELECT c.settings->>'checkInFrequency' FROM public.couples c WHERE c.id = p_couple_id
    ),
    'last_check_in_date', (
      SELECT ci.completed_at FROM public.check_ins ci
      WHERE ci.couple_id = p_couple_id AND ci.status = 'completed'
      ORDER BY ci.completed_at DESC LIMIT 1
    ),
    'top_languages', (
      SELECT coalesce(json_agg(json_build_object('title', ll.title, 'category', ll.category)), '[]'::json)
      FROM (
        SELECT title, category FROM public.love_languages
        WHERE couple_id = p_couple_id AND privacy = 'shared'
        LIMIT 3
      ) ll
    ),
    'partner_top_language', (
      SELECT json_build_object('title', ll.title, 'category', ll.category)
      FROM public.love_languages ll
      WHERE ll.couple_id = p_couple_id AND ll.privacy = 'shared' AND ll.user_id != p_user_id
      LIMIT 1
    ),
    'today_reminders', (
      SELECT coalesce(json_agg(json_build_object(
        'id', r.id,
        'title', r.title,
        'scheduled_for', r.scheduled_for,
        'category', r.category,
        'is_overdue', r.scheduled_for < now()
      ) ORDER BY r.scheduled_for), '[]'::json)
      FROM public.reminders r
      WHERE r.couple_id = p_couple_id
        AND r.is_active = true
        AND r.scheduled_for >= v_today_start
        AND r.scheduled_for < v_today_end
      LIMIT 5
    ),
    'pending_request_count', (
      SELECT count(*) FROM public.requests
      WHERE couple_id = p_couple_id AND requested_for = p_user_id AND status = 'pending'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary TO authenticated;
