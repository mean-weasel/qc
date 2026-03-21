-- Add discussion prompts to categories
-- Wrap in DO block to defer table resolution in Supabase CLI batch mode
DO $category_prompts$
BEGIN
  ALTER TABLE public.categories ADD COLUMN prompts jsonb DEFAULT '[]'::jsonb;
  COMMENT ON COLUMN public.categories.prompts IS 'Array of discussion prompt strings for this category';
END;
$category_prompts$;
