CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('habit', 'check-in', 'action-item', 'special-date', 'custom')),
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notification_channel TEXT NOT NULL DEFAULT 'in-app' CHECK (notification_channel IN ('in-app', 'email', 'both', 'none')),
  custom_schedule JSONB
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read reminders" ON public.reminders
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create reminders" ON public.reminders
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update reminders" ON public.reminders
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete reminders" ON public.reminders
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_for UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('activity', 'task', 'reminder', 'conversation', 'date-night', 'custom')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'converted')),
  suggested_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read requests" ON public.requests
  FOR SELECT USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can create requests" ON public.requests
  FOR INSERT WITH CHECK (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can update requests" ON public.requests
  FOR UPDATE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Couple members can delete requests" ON public.requests
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
