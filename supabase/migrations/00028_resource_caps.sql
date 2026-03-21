-- Generic trigger function to enforce per-couple resource limits.
-- TG_ARGV[0] = column name for couple_id (always 'couple_id')
-- TG_ARGV[1] = max allowed rows per couple
CREATE OR REPLACE FUNCTION enforce_couple_resource_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
  v_max   integer;
BEGIN
  v_max := TG_ARGV[1]::integer;

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE couple_id = $1',
    TG_TABLE_NAME
  )
  INTO v_count
  USING NEW.couple_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Resource limit reached: % allows at most % rows per couple', TG_TABLE_NAME, v_max;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers via DO block to avoid batch-mode parse failures.
-- Supabase CLI sends all migrations as a batch where statements are parsed
-- before execution, so CREATE TRIGGER ON a table from another migration file
-- would fail with "relation does not exist". DO blocks are parsed as a single
-- statement, deferring the internal DDL until execution time.
DO $resource_caps$
BEGIN
  CREATE TRIGGER trg_reminders_resource_cap
    BEFORE INSERT ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '50');

  CREATE TRIGGER trg_notes_resource_cap
    BEFORE INSERT ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '1000');

  CREATE TRIGGER trg_milestones_resource_cap
    BEFORE INSERT ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '200');

  CREATE TRIGGER trg_requests_resource_cap
    BEFORE INSERT ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '100');

  CREATE TRIGGER trg_action_items_resource_cap
    BEFORE INSERT ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '500');

  CREATE TRIGGER trg_love_actions_resource_cap
    BEFORE INSERT ON public.love_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_couple_resource_limit('couple_id', '500');
END;
$resource_caps$;
