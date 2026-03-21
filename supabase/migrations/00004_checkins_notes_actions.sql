-- Check-ins table
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
  categories TEXT[] NOT NULL DEFAULT '{}',
  mood_before INT CHECK (mood_before BETWEEN 1 AND 5),
  mood_after INT CHECK (mood_after BETWEEN 1 AND 5),
  reflection TEXT
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read check-ins" ON public.check_ins
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update check-ins" ON public.check_ins
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete check-ins" ON public.check_ins
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

-- Notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  privacy TEXT NOT NULL DEFAULT 'shared' CHECK (privacy IN ('private', 'shared', 'draft')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  category_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read shared notes" ON public.notes
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    AND (privacy != 'private' OR author_id = auth.uid())
  );
CREATE POLICY "Couple members can create notes" ON public.notes
  FOR INSERT WITH CHECK (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    AND author_id = auth.uid()
  );
CREATE POLICY "Authors can update own notes" ON public.notes
  FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Authors can delete own notes" ON public.notes
  FOR DELETE USING (author_id = auth.uid());

-- Action items table
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read action items" ON public.action_items
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create action items" ON public.action_items
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update action items" ON public.action_items
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete action items" ON public.action_items
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
