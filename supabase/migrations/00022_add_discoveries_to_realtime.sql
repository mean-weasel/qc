-- WT-4 Code Review Fix: Add love_language_discoveries to realtime publication
-- IMPORTANT-1: Enable realtime sync for partner discovery visibility

ALTER PUBLICATION supabase_realtime ADD TABLE public.love_language_discoveries;
