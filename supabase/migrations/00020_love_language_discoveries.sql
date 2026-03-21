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
