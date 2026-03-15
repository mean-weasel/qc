-- Restrict milestone-photos bucket to 10MB per file (down from global 50MB)
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'milestone-photos';

-- Replace overly permissive upload policy (from 00005_milestones.sql) with couple-scoped one
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

CREATE POLICY "Couple members can upload milestone photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'milestone-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT couple_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
