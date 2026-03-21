-- Add reminders and milestones tables to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
