-- Make milestone-photos bucket private so photos require signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'milestone-photos';
