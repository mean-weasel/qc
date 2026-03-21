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
