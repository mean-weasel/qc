-- Couples table
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  relationship_start_date DATE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- Extend profiles with couple_id
ALTER TABLE public.profiles
  ADD COLUMN couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger: enforce max 2 members per couple
CREATE OR REPLACE FUNCTION public.check_couple_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.couple_id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE couple_id = NEW.couple_id AND id != NEW.id) >= 2 THEN
      RAISE EXCEPTION 'A couple can have at most 2 members';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_couple_member_limit
  BEFORE INSERT OR UPDATE OF couple_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_couple_member_limit();

-- Couple invites table
CREATE TABLE public.couple_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.couple_invites ENABLE ROW LEVEL SECURITY;

-- RLS for couples
CREATE POLICY "Users can read own couple" ON public.couples
  FOR SELECT USING (id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own couple" ON public.couples
  FOR UPDATE USING (id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create couples" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for couple_invites
CREATE POLICY "Users can read invites for their couple" ON public.couple_invites
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    OR invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invites for their couple" ON public.couple_invites
  FOR INSERT WITH CHECK (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update invites for their couple" ON public.couple_invites
  FOR UPDATE USING (
    couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    OR invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
