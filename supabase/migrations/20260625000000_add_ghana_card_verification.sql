-- Step 1: Add Ghana Card Number column to teacher_profiles
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS ghana_card_number TEXT;

-- Step 2: Add format check constraint for GHA-XXXXXXXXX-X (GHA- followed by 9 digits and a trailing digit)
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_ghana_card_number_check;
ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_ghana_card_number_check 
  CHECK (ghana_card_number IS NULL OR ghana_card_number ~ '^GHA-\d{9}-\d$');

-- Step 3: Update check constraint on verification_documents table to include new document types
ALTER TABLE public.verification_documents DROP CONSTRAINT IF EXISTS verification_documents_document_type_check;
ALTER TABLE public.verification_documents ADD CONSTRAINT verification_documents_document_type_check 
  CHECK (document_type IN ('national_id', 'facial_verification', 'degree', 'qualifications', 'teaching_certificate', 'ghana_card_front', 'ghana_card_back', 'selfie_image'));
