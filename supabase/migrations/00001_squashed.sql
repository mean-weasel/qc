-- Squashed from 32 migration files
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

-- Auto-create subscription when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscription();

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
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
-- SECURITY DEFINER function for couple creation during onboarding.
-- auth.uid() may be NULL in Next.js server actions on Vercel,
-- so we bypass RLS by using a trusted function that accepts user_id as a parameter.
CREATE OR REPLACE FUNCTION public.create_couple_for_user(p_user_id UUID, p_couple_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_couple_id UUID;
BEGIN
  INSERT INTO public.couples (name)
  VALUES (p_couple_name)
  RETURNING id INTO v_couple_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id
  WHERE id = p_user_id;

  RETURN v_couple_id;
END;
$$;
-- Allow users to read profiles of their couple partner.
-- The original 00001 migration only allows reading your OWN profile.
-- Many features (requests, love languages, etc.) need to query the partner's
-- profile to display their name and id.
--
-- We use a SECURITY DEFINER function to get the current user's couple_id
-- because referencing the profiles table in its own RLS policy would cause
-- a recursive evaluation issue in Postgres.

CREATE OR REPLACE FUNCTION public.get_my_couple_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT couple_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Users can read profiles in same couple"
  ON public.profiles
  FOR SELECT
  USING (
    couple_id IS NOT NULL
    AND couple_id = public.get_my_couple_id()
  );
-- Add new behavioral fields to session_settings
ALTER TABLE session_settings
  ADD COLUMN IF NOT EXISTS pause_notifications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_save_drafts boolean DEFAULT true;
-- Add snooze, assignment, and cross-feature linking columns to reminders
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS is_snoozed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS related_check_in_id uuid REFERENCES check_ins(id),
  ADD COLUMN IF NOT EXISTS related_action_item_id uuid REFERENCES action_items(id);
-- Add email status tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN email_bounced_at TIMESTAMPTZ,
  ADD COLUMN email_complained_at TIMESTAMPTZ,
  ADD COLUMN email_unsubscribe_token TEXT DEFAULT gen_random_uuid()::text,
  ADD COLUMN email_opted_out_at TIMESTAMPTZ;

-- Backfill unsubscribe tokens for existing profiles
UPDATE public.profiles
  SET email_unsubscribe_token = gen_random_uuid()::text
  WHERE email_unsubscribe_token IS NULL;

-- Ensure unsubscribe tokens are unique
CREATE UNIQUE INDEX idx_profiles_unsubscribe_token ON public.profiles (email_unsubscribe_token);
-- Session Settings Proposals Table
-- This enables partners to propose session setting changes that require mutual agreement

CREATE TABLE session_settings_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  proposed_by UUID REFERENCES profiles(id) NOT NULL,
  proposed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  settings JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE session_settings_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: couple-scoped access
CREATE POLICY "Users can view proposals for their couple"
  ON session_settings_proposals
  FOR SELECT
  USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create proposals for their couple"
  ON session_settings_proposals
  FOR INSERT
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND proposed_by = auth.uid()
  );

CREATE POLICY "Users can update proposals for their couple"
  ON session_settings_proposals
  FOR UPDATE
  USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()));

-- Add version tracking and agreement tracking to session_settings
ALTER TABLE session_settings
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN agreed_by UUID[] DEFAULT '{}';

-- Create index for faster proposal lookups
CREATE INDEX idx_session_settings_proposals_couple_id ON session_settings_proposals(couple_id);
CREATE INDEX idx_session_settings_proposals_status ON session_settings_proposals(status);

-- Enable realtime for session_settings_proposals
ALTER PUBLICATION supabase_realtime ADD TABLE session_settings_proposals;
-- Categories Table
-- Enables couples to customize discussion categories for check-ins

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: couple-scoped access
CREATE POLICY "Users can view categories for their couple"
  ON categories
  FOR SELECT
  USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create categories for their couple"
  ON categories
  FOR INSERT
  WITH CHECK (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update categories for their couple"
  ON categories
  FOR UPDATE
  USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete categories for their couple"
  ON categories
  FOR DELETE
  USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

-- Create index for faster category lookups
CREATE INDEX idx_categories_couple_id ON categories(couple_id);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

-- Enable realtime for categories
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Function to seed default categories for a couple
CREATE OR REPLACE FUNCTION seed_default_categories(p_couple_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (couple_id, name, description, icon, is_system, sort_order)
  VALUES
    (p_couple_id, 'Communication', 'How we talk and listen to each other', '💬', true, 1),
    (p_couple_id, 'Quality Time', 'Spending meaningful time together', '⏰', true, 2),
    (p_couple_id, 'Future Planning', 'Goals, dreams, and plans ahead', '🎯', true, 3),
    (p_couple_id, 'Challenges', 'Issues or concerns we need to address', '💪', true, 4);
END;
$$;
-- Trigger to automatically seed default categories when a new couple is created
-- This ensures every couple gets the standard Communication, Quality Time, Future Planning, and Challenges categories

CREATE OR REPLACE FUNCTION public.seed_categories_on_couple_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seed_categories
  AFTER INSERT ON public.couples
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_categories_on_couple_insert();
-- RPC function for atomic JSONB merge on couples.settings
-- Prevents race conditions when multiple settings are updated concurrently

CREATE OR REPLACE FUNCTION public.update_couple_setting(
  p_couple_id UUID,
  p_key TEXT,
  p_value BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.couples
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(p_key, p_value)
  WHERE id = p_couple_id;
END;
$$;
-- Add reminders and milestones tables to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
-- Migration 00016: Bidirectional FK columns for request-to-reminder conversion
-- Part of WT-4 Cross-Feature Linking

-- Add bidirectional foreign key columns for request-to-reminder conversion
ALTER TABLE requests
  ADD COLUMN converted_to_reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL;

ALTER TABLE reminders
  ADD COLUMN converted_from_request_id UUID REFERENCES requests(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_requests_converted_to_reminder ON requests(converted_to_reminder_id) WHERE converted_to_reminder_id IS NOT NULL;
CREATE INDEX idx_reminders_converted_from_request ON reminders(converted_from_request_id) WHERE converted_from_request_id IS NOT NULL;

-- Add a 'converted' status to requests if it doesn't exist
-- (existing statuses are 'pending', 'accepted', 'declined')
-- No ALTER TABLE needed - just document that converted requests should have status='accepted'
-- and non-null converted_to_reminder_id
-- Migration 00017: Love language discovery system
-- Part of WT-4 Cross-Feature Linking

-- Create love_language_discoveries table
CREATE TABLE love_language_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  check_in_id UUID REFERENCES check_ins(id) ON DELETE SET NULL,
  discovery TEXT NOT NULL,
  converted_to_language_id UUID REFERENCES love_languages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE love_language_discoveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: couple-scoped with user_id privacy
-- Users can only see their own discoveries
CREATE POLICY "Users can view own discoveries"
  ON love_language_discoveries
  FOR SELECT
  USING (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Users can create their own discoveries
CREATE POLICY "Users can create own discoveries"
  ON love_language_discoveries
  FOR INSERT
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Users can update their own discoveries
CREATE POLICY "Users can update own discoveries"
  ON love_language_discoveries
  FOR UPDATE
  USING (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  )
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Users can delete their own discoveries
CREATE POLICY "Users can delete own discoveries"
  ON love_language_discoveries
  FOR DELETE
  USING (
    couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Create indexes for performance
CREATE INDEX idx_love_language_discoveries_couple ON love_language_discoveries(couple_id);
CREATE INDEX idx_love_language_discoveries_user ON love_language_discoveries(user_id);
CREATE INDEX idx_love_language_discoveries_check_in ON love_language_discoveries(check_in_id) WHERE check_in_id IS NOT NULL;
CREATE INDEX idx_love_language_discoveries_converted ON love_language_discoveries(converted_to_language_id) WHERE converted_to_language_id IS NOT NULL;
-- WT-4 Code Review Fix: Atomic request-to-reminder conversion
-- CRITICAL-1: Replace two-step DB operations with single RPC transaction

CREATE OR REPLACE FUNCTION public.convert_request_to_reminder(
  p_request_id UUID,
  p_couple_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_reminder_id UUID;
  v_result JSON;
BEGIN
  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = p_request_id AND couple_id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Request not found');
  END IF;

  IF v_request.status != 'accepted' THEN
    RETURN json_build_object('error', 'Only accepted requests can be converted');
  END IF;

  IF v_request.converted_to_reminder_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Request has already been converted');
  END IF;

  -- Create the reminder
  INSERT INTO public.reminders (couple_id, title, message, frequency, is_active, converted_from_request_id)
  VALUES (p_couple_id, v_request.title, v_request.description, 'once', true, p_request_id)
  RETURNING id INTO v_reminder_id;

  -- Update the request
  UPDATE public.requests
  SET status = 'converted', converted_to_reminder_id = v_reminder_id
  WHERE id = p_request_id;

  -- Return the reminder id
  RETURN json_build_object('reminder_id', v_reminder_id);
END;
$$;
-- WT-4 Code Review Fix: Add love_language_discoveries to realtime publication
-- IMPORTANT-1: Enable realtime sync for partner discovery visibility

ALTER PUBLICATION supabase_realtime ADD TABLE public.love_language_discoveries;
-- Drop the overly-permissive public read policy
DROP POLICY IF EXISTS "Anyone can read milestone photos" ON storage.objects;

-- Replace with couple-scoped read policy
-- Photos are stored in folders named by user_id, and couple members share access.
-- Pattern: milestone-photos/{user_id}/{filename}
CREATE POLICY "Couple members can read milestone photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'milestone-photos'
    AND (
      -- Owner can always read their own photos
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Partner can read photos if they share a couple
      (storage.foldername(name))[1] IN (
        SELECT p2.id::text
        FROM public.profiles p1
        JOIN public.profiles p2 ON p1.couple_id = p2.couple_id
        WHERE p1.id = auth.uid() AND p2.id != auth.uid()
      )
    )
  );

-- Also allow partner to delete photos (not just the uploader)
DROP POLICY IF EXISTS "Owners can delete their photos" ON storage.objects;

CREATE POLICY "Couple members can delete milestone photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'milestone-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      (storage.foldername(name))[1] IN (
        SELECT p2.id::text
        FROM public.profiles p1
        JOIN public.profiles p2 ON p1.couple_id = p2.couple_id
        WHERE p1.id = auth.uid() AND p2.id != auth.uid()
      )
    )
  );
-- Add discussion prompts to categories
ALTER TABLE categories ADD COLUMN prompts jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN categories.prompts IS 'Array of discussion prompt strings for this category';
-- Fix: convert_request_to_reminder was missing required columns in INSERT
-- Missing: created_by (NOT NULL), scheduled_for (NOT NULL), category (NOT NULL)

CREATE OR REPLACE FUNCTION public.convert_request_to_reminder(
  p_request_id UUID,
  p_couple_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_reminder_id UUID;
  v_scheduled_for TIMESTAMPTZ;
BEGIN
  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = p_request_id AND couple_id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Request not found');
  END IF;

  IF v_request.status != 'accepted' THEN
    RETURN json_build_object('error', 'Only accepted requests can be converted');
  END IF;

  IF v_request.converted_to_reminder_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Request has already been converted');
  END IF;

  -- Use the request's suggested_date if available, otherwise default to tomorrow
  v_scheduled_for := COALESCE(v_request.suggested_date, now() + interval '1 day');

  -- Create the reminder with all required NOT NULL columns
  INSERT INTO public.reminders (
    couple_id, created_by, title, message, category, frequency,
    scheduled_for, is_active, converted_from_request_id
  )
  VALUES (
    p_couple_id, p_user_id, v_request.title, v_request.description, 'custom', 'once',
    v_scheduled_for, true, p_request_id
  )
  RETURNING id INTO v_reminder_id;

  -- Update the request
  UPDATE public.requests
  SET status = 'converted', converted_to_reminder_id = v_reminder_id
  WHERE id = p_request_id;

  -- Return the reminder id
  RETURN json_build_object('reminder_id', v_reminder_id);
END;
$$;
-- Dashboard summary RPC: consolidates 11 individual queries into 1 round trip
-- Kept separate: getStreakData() (JS week calc) and getRecentActivity() (multi-table union)

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_couple_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
  v_couple_id UUID;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
BEGIN
  -- Verify caller belongs to the couple
  SELECT p.couple_id INTO v_couple_id
  FROM public.profiles p
  WHERE p.id = p_user_id AND p.couple_id = p_couple_id;

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not belong to this couple';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_today_end := v_today_start + interval '1 day';

  SELECT json_build_object(
    'check_in_count', (
      SELECT count(*) FROM public.check_ins WHERE couple_id = p_couple_id
    ),
    'note_count', (
      SELECT count(*) FROM public.notes WHERE couple_id = p_couple_id
    ),
    'milestone_count', (
      SELECT count(*) FROM public.milestones WHERE couple_id = p_couple_id
    ),
    'action_item_count', (
      SELECT count(*) FROM public.action_items
      WHERE couple_id = p_couple_id AND completed = false
    ),
    'total_languages', (
      SELECT count(*) FROM public.love_languages WHERE couple_id = p_couple_id
    ),
    'shared_languages', (
      SELECT count(*) FROM public.love_languages
      WHERE couple_id = p_couple_id AND privacy = 'shared'
    ),
    'today_action_count', (
      SELECT count(*) FROM public.love_actions WHERE couple_id = p_couple_id
    ),
    'relationship_start_date', (
      SELECT c.relationship_start_date FROM public.couples c WHERE c.id = p_couple_id
    ),
    'frequency_goal', (
      SELECT c.settings->>'checkInFrequency' FROM public.couples c WHERE c.id = p_couple_id
    ),
    'last_check_in_date', (
      SELECT ci.completed_at FROM public.check_ins ci
      WHERE ci.couple_id = p_couple_id AND ci.status = 'completed'
      ORDER BY ci.completed_at DESC LIMIT 1
    ),
    'top_languages', (
      SELECT coalesce(json_agg(json_build_object('title', ll.title, 'category', ll.category)), '[]'::json)
      FROM (
        SELECT title, category FROM public.love_languages
        WHERE couple_id = p_couple_id AND privacy = 'shared'
        LIMIT 3
      ) ll
    ),
    'partner_top_language', (
      SELECT json_build_object('title', ll.title, 'category', ll.category)
      FROM public.love_languages ll
      WHERE ll.couple_id = p_couple_id AND ll.privacy = 'shared' AND ll.user_id != p_user_id
      LIMIT 1
    ),
    'today_reminders', (
      SELECT coalesce(json_agg(json_build_object(
        'id', r.id,
        'title', r.title,
        'scheduled_for', r.scheduled_for,
        'category', r.category,
        'is_overdue', r.scheduled_for < now()
      ) ORDER BY r.scheduled_for), '[]'::json)
      FROM public.reminders r
      WHERE r.couple_id = p_couple_id
        AND r.is_active = true
        AND r.scheduled_for >= v_today_start
        AND r.scheduled_for < v_today_end
      LIMIT 5
    ),
    'pending_request_count', (
      SELECT count(*) FROM public.requests
      WHERE couple_id = p_couple_id AND requested_for = p_user_id AND status = 'pending'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary TO authenticated;
-- Rate limits table for Supabase-backed distributed rate limiting
-- Accessed exclusively via SECURITY DEFINER functions; no direct RLS policies needed.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (no policies -- access is via SECURITY DEFINER functions only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON public.rate_limits (expires_at);

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE expires_at <= now();
END;
$$;

-- Atomic upsert-based rate limit check.
-- Returns TRUE if the request is allowed (count <= p_max_requests), FALSE if rate limited.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start, expires_at)
  VALUES (p_key, 1, now(), now() + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN public.rate_limits.expires_at <= now() THEN 1 ELSE public.rate_limits.count + 1 END,
    window_start = CASE WHEN public.rate_limits.expires_at <= now() THEN now() ELSE public.rate_limits.window_start END,
    expires_at = CASE WHEN public.rate_limits.expires_at <= now() THEN now() + (p_window_seconds || ' seconds')::interval ELSE public.rate_limits.expires_at END
  RETURNING count <= p_max_requests INTO v_allowed;

  RETURN v_allowed;
END;
$$;

-- Prevent duplicate active check-in sessions per couple
-- Only one in-progress check-in allowed at a time per couple
CREATE UNIQUE INDEX idx_check_ins_active_couple
ON check_ins (couple_id)
WHERE status = 'in-progress';
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
  BEFORE INSERT ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '50');

-- notes: 1000 per couple
CREATE TRIGGER trg_notes_resource_cap
  BEFORE INSERT ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '1000');

-- milestones: 200 per couple
CREATE TRIGGER trg_milestones_resource_cap
  BEFORE INSERT ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '200');

-- requests: 100 per couple
CREATE TRIGGER trg_requests_resource_cap
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '100');

-- action_items: 500 per couple
CREATE TRIGGER trg_action_items_resource_cap
  BEFORE INSERT ON public.action_items
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '500');

-- love_actions: 500 per couple
CREATE TRIGGER trg_love_actions_resource_cap
  BEFORE INSERT ON public.love_actions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_couple_resource_limit('couple_id', '500');
-- Restrict milestone-photos bucket to 10MB per file (down from global 50MB)
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'milestone-photos';

-- Replace overly permissive upload policy (from 00005_milestones.sql) with couple-scoped one
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

CREATE POLICY "Couple members can upload milestone photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'milestone-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT couple_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Couple members can delete invites" ON public.couple_invites
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Couple members can delete proposals" ON public.session_settings_proposals
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
-- Waitlist table for capturing interest during private beta
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on lowercase email to prevent duplicates
CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- No public access policies. Only service role (admin client) can read/write.
-- This table is accessed exclusively via server actions.
