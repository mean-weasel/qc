-- Drop the overly-permissive public read policy
DROP POLICY IF EXISTS "Anyone can read milestone photos" ON storage.objects;

-- Replace with couple-scoped read policy
-- Photos are stored in folders named by user_id, and couple members share access.
-- Pattern: milestone-photos/{user_id}/{filename}
CREATE POLICY "Couple members can read milestone photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'milestone-photos'
    AND (
      -- Owner can always read their own photos
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Partner can read photos if they share a couple
      (storage.foldername(name))[1] IN (
        SELECT p2.id::text
        FROM public.profiles p1
        JOIN public.profiles p2 ON p1.couple_id = p2.couple_id
        WHERE p1.id = auth.uid() AND p2.id != auth.uid()
      )
    )
  );

-- Also allow partner to delete photos (not just the uploader)
DROP POLICY IF EXISTS "Owners can delete their photos" ON storage.objects;

CREATE POLICY "Couple members can delete milestone photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'milestone-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      (storage.foldername(name))[1] IN (
        SELECT p2.id::text
        FROM public.profiles p1
        JOIN public.profiles p2 ON p1.couple_id = p2.couple_id
        WHERE p1.id = auth.uid() AND p2.id != auth.uid()
      )
    )
  );
