CREATE TABLE public.love_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('words', 'acts', 'gifts', 'time', 'touch', 'custom')),
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('private', 'shared')),
  importance TEXT NOT NULL DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'essential')),
  examples TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.love_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read shared love languages" ON public.love_languages
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    AND (privacy = 'shared' OR user_id = auth.uid())
  );
CREATE POLICY "Users can create love languages" ON public.love_languages
  FOR INSERT WITH CHECK (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );
CREATE POLICY "Users can update own love languages" ON public.love_languages
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own love languages" ON public.love_languages
  FOR DELETE USING (user_id = auth.uid());

CREATE TABLE public.love_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  linked_language_id UUID REFERENCES public.love_languages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'planned', 'completed', 'recurring')),
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'weekly', 'monthly', 'surprise')),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'moderate', 'challenging')),
  completed_count INT NOT NULL DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.love_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read love actions" ON public.love_actions
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create love actions" ON public.love_actions
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update love actions" ON public.love_actions
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete love actions" ON public.love_actions
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
