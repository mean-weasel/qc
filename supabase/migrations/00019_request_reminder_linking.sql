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
