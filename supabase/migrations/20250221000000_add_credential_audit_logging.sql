-- Migration: Add comprehensive audit logging for credential management
-- Date: 2025-02-21
-- Purpose: Track all credential-related operations for compliance and security

-- Create audit_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'CREDENTIAL_UPLOAD',
    'CREDENTIAL_APPROVE',
    'CREDENTIAL_REJECT',
    'CREDENTIAL_DELETE',
    'CREDENTIAL_VIEW',
    'DOCUMENT_DOWNLOAD'
  )),
  
  -- Entity details
  credential_id UUID REFERENCES verification_documents(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Operation context
  document_type TEXT,
  document_name TEXT,
  action_reason TEXT,
  metadata JSONB DEFAULT NULL,
  
  -- IP and user agent for security tracking
  ip_address INET,
  user_agent TEXT,
  
  -- Status and result
  status TEXT CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')) DEFAULT 'SUCCESS',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  is_sensitive BOOLEAN DEFAULT FALSE  -- Marks operations requiring heightened scrutiny
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_teacher_id ON audit_logs(teacher_id);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_credential_id ON audit_logs(credential_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Create index on sensitive operations
CREATE INDEX idx_audit_logs_sensitive ON audit_logs(is_sensitive, created_at DESC)
WHERE is_sensitive = TRUE;

-- Create a view for sensitive audit activity (deletions, rejections, etc.)
CREATE OR REPLACE VIEW sensitive_audit_activity AS
SELECT
  id,
  operation_type,
  teacher_id,
  admin_id,
  document_type,
  status,
  created_at,
  ip_address
FROM audit_logs
WHERE operation_type IN ('CREDENTIAL_DELETE', 'CREDENTIAL_REJECT')
  OR (is_sensitive = TRUE AND status = 'SUCCESS')
ORDER BY created_at DESC;

-- Create a view for deletion history per teacher
CREATE OR REPLACE VIEW teacher_credential_deletion_history AS
SELECT
  teacher_id,
  COUNT(*) as total_deletions,
  COUNT(CASE WHEN operation_type = 'CREDENTIAL_DELETE' THEN 1 END) as credential_deletions,
  MAX(created_at) as most_recent_deletion,
  ARRAY_AGG(DISTINCT document_type) as deleted_document_types
FROM audit_logs
WHERE operation_type IN ('CREDENTIAL_DELETE')
GROUP BY teacher_id;

-- Create a view for admin activity tracking
CREATE OR REPLACE VIEW admin_credential_activity AS
SELECT
  admin_id,
  operation_type,
  COUNT(*) as action_count,
  COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_actions,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_actions
FROM audit_logs
WHERE admin_id IS NOT NULL
GROUP BY admin_id, operation_type;

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs - FIXED

-- Teachers can only view their own audit logs
CREATE POLICY "Teachers can view their own audit logs"
ON audit_logs
FOR SELECT
USING (teacher_id = auth.uid() OR auth.jwt() ->> 'role' = 'authenticated_teacher');

-- Admins can view all audit logs related to credentials they manage
CREATE POLICY "Admins can view all audit logs"
ON audit_logs
FOR SELECT
USING (
  auth.jwt() ->> 'user_role' = 'admin'
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- No one can directly insert into audit_logs (only via stored procedures)
-- FIXED: Changed USING to WITH CHECK for INSERT policy
CREATE POLICY "Prevent direct inserts to audit_logs"
ON audit_logs
FOR INSERT
WITH CHECK (FALSE);

-- No one can modify audit_logs (immutable audit trail)
CREATE POLICY "Prevent all modifications to audit_logs"
ON audit_logs
FOR UPDATE
USING (FALSE);

CREATE POLICY "Prevent all deletes from audit_logs"
ON audit_logs
FOR DELETE
USING (FALSE);

-- Create function to log credential operations
CREATE OR REPLACE FUNCTION log_credential_operation(
  p_operation_type TEXT,
  p_credential_id UUID,
  p_teacher_id UUID,
  p_document_type TEXT,
  p_document_name TEXT,
  p_action_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    operation_type,
    credential_id,
    teacher_id,
    document_type,
    document_name,
    action_reason,
    metadata,
    ip_address,
    user_agent,
    is_sensitive
  ) VALUES (
    p_operation_type,
    p_credential_id,
    p_teacher_id,
    p_document_type,
    p_document_name,
    p_action_reason,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_operation_type IN ('CREDENTIAL_DELETE', 'CREDENTIAL_REJECT')
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark operation as completed
CREATE OR REPLACE FUNCTION mark_audit_operation_completed(
  p_log_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE audit_logs
  SET
    status = p_status,
    error_message = p_error_message,
    completed_at = CURRENT_TIMESTAMP
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON sensitive_audit_activity TO authenticated;
GRANT SELECT ON teacher_credential_deletion_history TO authenticated;
GRANT SELECT ON admin_credential_activity TO authenticated;

-- Update the verification_documents table to add audit triggers
-- This trigger logs all verification document updates
CREATE OR REPLACE FUNCTION audit_verification_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_credential_operation(
      'CREDENTIAL_DELETE',
      OLD.id,
      OLD.teacher_id,
      OLD.document_type,
      OLD.file_name,
      'Document deleted by teacher'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM log_credential_operation(
        CASE 
          WHEN NEW.status = 'approved' THEN 'CREDENTIAL_APPROVE'
          WHEN NEW.status = 'rejected' THEN 'CREDENTIAL_REJECT'
          ELSE 'CREDENTIAL_UPDATE'
        END,
        NEW.id,
        NEW.teacher_id,
        NEW.document_type,
        NEW.file_name,
        'Status changed to: ' || NEW.status,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_credential_operation(
      'CREDENTIAL_UPLOAD',
      NEW.id,
      NEW.teacher_id,
      NEW.document_type,
      NEW.file_name,
      'Document uploaded'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on verification_documents table
DROP TRIGGER IF EXISTS verification_documents_audit_trigger ON verification_documents;
CREATE TRIGGER verification_documents_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON verification_documents
FOR EACH ROW
EXECUTE FUNCTION audit_verification_documents();

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit log for all credential-related operations. Used for compliance, security, and troubleshooting.';
COMMENT ON COLUMN audit_logs.operation_type IS 'Type of operation: UPLOAD, APPROVE, REJECT, DELETE, VIEW, DOWNLOAD';
COMMENT ON COLUMN audit_logs.is_sensitive IS 'Flag for sensitive operations (deletions, rejections) requiring heightened scrutiny';
COMMENT ON VIEW sensitive_audit_activity IS 'View of sensitive credential operations (deletions, rejections) for compliance reporting';
COMMENT ON VIEW teacher_credential_deletion_history IS 'Summary of credential deletions per teacher for pattern detection';
COMMENT ON VIEW admin_credential_activity IS 'Summary of admin actions on credentials for oversight';
COMMENT ON FUNCTION log_credential_operation IS 'Log a credential-related operation to the audit log';
COMMENT ON FUNCTION mark_audit_operation_completed IS 'Mark an audit operation as completed with final status';