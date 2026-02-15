
-- Make verification-documents bucket public so admin and teachers can view files
UPDATE storage.buckets SET public = true WHERE id = 'verification-documents';

-- Add public SELECT policy for verification-documents bucket if not exists
CREATE POLICY "Public can view verification documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'verification-documents');
