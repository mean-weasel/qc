-- Add snooze, assignment, and cross-feature linking columns to reminders
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS is_snoozed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS related_check_in_id uuid REFERENCES check_ins(id),
  ADD COLUMN IF NOT EXISTS related_action_item_id uuid REFERENCES action_items(id);
