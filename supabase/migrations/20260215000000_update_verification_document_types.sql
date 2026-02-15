-- Update verification_documents table to include all document types used in frontend
ALTER TABLE public.verification_documents
DROP CONSTRAINT verification_documents_document_type_check;

ALTER TABLE public.verification_documents
ADD CONSTRAINT verification_documents_document_type_check
CHECK (document_type IN ('national_id', 'facial_verification', 'degree', 'qualifications', 'teaching_certificate'));