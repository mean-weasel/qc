-- Add indexes on foreign keys flagged by Supabase performance advisor.
-- Most critical: couple_id (used in every RLS policy evaluation).

-- couple_id indexes (used in RLS on every query)
CREATE INDEX IF NOT EXISTS idx_check_ins_couple_id ON public.check_ins (couple_id);
CREATE INDEX IF NOT EXISTS idx_notes_couple_id ON public.notes (couple_id);
CREATE INDEX IF NOT EXISTS idx_action_items_couple_id ON public.action_items (couple_id);
CREATE INDEX IF NOT EXISTS idx_milestones_couple_id ON public.milestones (couple_id);
CREATE INDEX IF NOT EXISTS idx_reminders_couple_id ON public.reminders (couple_id);
CREATE INDEX IF NOT EXISTS idx_requests_couple_id ON public.requests (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_languages_couple_id ON public.love_languages (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_actions_couple_id ON public.love_actions (couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_invites_couple_id ON public.couple_invites (couple_id);
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON public.profiles (couple_id);
CREATE INDEX IF NOT EXISTS idx_categories_couple_id ON public.categories (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_couple_id ON public.love_language_discoveries (couple_id);
CREATE INDEX IF NOT EXISTS idx_session_settings_couple_id ON public.session_settings (couple_id);

-- Other frequently-queried foreign keys
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes (author_id);
CREATE INDEX IF NOT EXISTS idx_notes_check_in_id ON public.notes (check_in_id);
CREATE INDEX IF NOT EXISTS idx_action_items_check_in_id ON public.action_items (check_in_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON public.action_items (assigned_to);
CREATE INDEX IF NOT EXISTS idx_love_languages_user_id ON public.love_languages (user_id);
CREATE INDEX IF NOT EXISTS idx_love_actions_linked_language_id ON public.love_actions (linked_language_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_user_id ON public.love_language_discoveries (user_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_check_in_id ON public.love_language_discoveries (check_in_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders (created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON public.reminders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_related_action_item_id ON public.reminders (related_action_item_id);
CREATE INDEX IF NOT EXISTS idx_reminders_related_check_in_id ON public.reminders (related_check_in_id);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON public.requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_requests_requested_for ON public.requests (requested_for);
CREATE INDEX IF NOT EXISTS idx_couple_invites_invited_by ON public.couple_invites (invited_by);
-- Note: session_settings_proposals.couple_id already indexed in migration 00014
CREATE INDEX IF NOT EXISTS idx_session_settings_proposals_proposed_by ON public.session_settings_proposals (proposed_by);
CREATE INDEX IF NOT EXISTS idx_session_settings_proposals_reviewed_by ON public.session_settings_proposals (reviewed_by);
