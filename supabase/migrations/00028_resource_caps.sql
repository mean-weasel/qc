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

-- reminders: 50 per couple
CREATE TRIGGER trg_reminders_resource_cap
  BEFORE INSERT ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '50');

-- notes: 1000 per couple
CREATE TRIGGER trg_notes_resource_cap
  BEFORE INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '1000');

-- milestones: 200 per couple
CREATE TRIGGER trg_milestones_resource_cap
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '200');

-- requests: 100 per couple
CREATE TRIGGER trg_requests_resource_cap
  BEFORE INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '100');

-- action_items: 500 per couple
CREATE TRIGGER trg_action_items_resource_cap
  BEFORE INSERT ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '500');

-- love_actions: 500 per couple
CREATE TRIGGER trg_love_actions_resource_cap
  BEFORE INSERT ON love_actions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '500');
