CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('relationship', 'communication', 'intimacy', 'growth', 'adventure', 'milestone', 'custom')),
  icon TEXT,
  achieved_at TIMESTAMPTZ,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points INT NOT NULL DEFAULT 0,
  photo_url TEXT
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read milestones" ON public.milestones
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create milestones" ON public.milestones
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update milestones" ON public.milestones
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete milestones" ON public.milestones
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

-- Storage bucket for milestone photos
INSERT INTO storage.buckets (id, name, public) VALUES ('milestone-photos', 'milestone-photos', true);

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'milestone-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can read milestone photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'milestone-photos');

CREATE POLICY "Owners can delete their photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'milestone-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
