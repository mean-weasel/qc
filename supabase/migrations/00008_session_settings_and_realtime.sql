CREATE TABLE public.session_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  session_duration INT NOT NULL DEFAULT 600,
  timeouts_per_partner INT NOT NULL DEFAULT 2,
  timeout_duration INT NOT NULL DEFAULT 60,
  turn_based_mode BOOLEAN NOT NULL DEFAULT false,
  turn_duration INT NOT NULL DEFAULT 120,
  allow_extensions BOOLEAN NOT NULL DEFAULT true,
  warm_up_questions BOOLEAN NOT NULL DEFAULT false,
  cool_down_time INT NOT NULL DEFAULT 60,
  CONSTRAINT session_settings_couple_id_unique UNIQUE (couple_id)
);

ALTER TABLE public.session_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read session settings" ON public.session_settings
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create session settings" ON public.session_settings
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update session settings" ON public.session_settings
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

-- Enable Supabase Realtime on high-frequency tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_actions;

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.love_languages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
