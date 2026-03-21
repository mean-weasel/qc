-- Add discussion prompts to categories
ALTER TABLE categories ADD COLUMN prompts jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN categories.prompts IS 'Array of discussion prompt strings for this category';
