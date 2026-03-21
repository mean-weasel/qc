-- Trigger to automatically seed default categories when a new couple is created
-- This ensures every couple gets the standard Communication, Quality Time, Future Planning, and Challenges categories

-- Function definition kept outside DO block (CREATE FUNCTION is not valid procedural PL/pgSQL)
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

DO $fix$
BEGIN
  EXECUTE $sql$
    CREATE TRIGGER trigger_seed_categories
      AFTER INSERT ON public.couples
      FOR EACH ROW
      EXECUTE FUNCTION public.seed_categories_on_couple_insert()
  $sql$;
END;
$fix$;
