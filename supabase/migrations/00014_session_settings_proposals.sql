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
