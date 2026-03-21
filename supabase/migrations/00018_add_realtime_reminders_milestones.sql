DO $fix$
BEGIN
  -- Add reminders and milestones tables to Supabase Realtime publication
  EXECUTE $sql$
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders
  $sql$;
  EXECUTE $sql$
    ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones
  $sql$;
END;
$fix$;
