-- Ensure audit for verification_documents uses BEFORE DELETE so FK to verification_documents is valid
-- Timestamp: 2026-02-23

-- Drop existing audit trigger if present
DROP TRIGGER IF EXISTS verification_documents_audit_trigger ON public.verification_documents;

-- Create trigger function remains the same (uses OLD/NEW as appropriate)
-- Recreate triggers: BEFORE DELETE, AFTER INSERT OR UPDATE
CREATE TRIGGER verification_documents_audit_trigger
  BEFORE DELETE ON public.verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_verification_documents();

DROP TRIGGER IF EXISTS verification_documents_audit_trigger_after ON public.verification_documents;
CREATE TRIGGER verification_documents_audit_trigger_after
  AFTER INSERT OR UPDATE ON public.verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_verification_documents();

-- Note: running the audit on DELETE before the row is removed prevents FK violation when audit_log references the credential id.
