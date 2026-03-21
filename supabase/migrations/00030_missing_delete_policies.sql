DO $fix$
BEGIN
  EXECUTE $sql$
    CREATE POLICY "Couple members can delete invites" ON public.couple_invites
      FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Couple members can delete proposals" ON public.session_settings_proposals
      FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()))
  $sql$;
END;
$fix$;
