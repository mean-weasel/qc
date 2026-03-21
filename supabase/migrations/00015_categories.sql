DO $fix$
BEGIN
  -- Categories Table
  -- Enables couples to customize discussion categories for check-ins

  EXECUTE $sql$
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
    )
  $sql$;

  -- Enable RLS
  EXECUTE $sql$
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY
  $sql$;

  -- RLS Policies: couple-scoped access
  EXECUTE $sql$
    CREATE POLICY "Users can view categories for their couple"
      ON categories
      FOR SELECT
      USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can create categories for their couple"
      ON categories
      FOR INSERT
      WITH CHECK (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can update categories for their couple"
      ON categories
      FOR UPDATE
      USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can delete categories for their couple"
      ON categories
      FOR DELETE
      USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()) AND is_system = false)
  $sql$;

  -- Create index for faster category lookups
  EXECUTE $sql$
    CREATE INDEX idx_categories_couple_id ON categories(couple_id)
  $sql$;
  EXECUTE $sql$
    CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true
  $sql$;

  -- Enable realtime for categories
  EXECUTE $sql$
    ALTER PUBLICATION supabase_realtime ADD TABLE categories
  $sql$;

END;
$fix$;

-- Function to seed default categories for a couple
-- (kept outside DO block as CREATE FUNCTION is not valid procedural PL/pgSQL)
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
