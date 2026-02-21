# Credential Audit Logging - Deployment Guide

## Overview

The credential audit logging system provides comprehensive tracking of all credential-related operations, enabling compliance reporting, security monitoring, and pattern detection.

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] Backup production Supabase database
- [ ] Review the migration file for any conflicts
- [ ] Ensure you have admin access to Supabase
- [ ] Test migrations in staging environment first
- [ ] Notify relevant stakeholders of deployment

### 2. Deploy the Migration

#### Via Supabase CLI

```bash
# Ensure you're in your Supabase project directory
cd supabase

# Apply the migration
supabase migration up

# Or if running migrations for the first time
supabase db push
```

#### Via Supabase Dashboard

1. Go to SQL Editor in your Supabase dashboard
2. Create a new SQL query
3. Copy the contents of `20250221000000_add_credential_audit_logging.sql`
4. Execute the query

#### Manual Deployment (if needed)

1. Open Supabase SQL Editor
2. Run migrations in this order:
   - Create `audit_logs` table
   - Create indexes
   - Create views
   - Enable RLS and create policies
   - Create functions and triggers

### 3. Verify Deployment

```sql
-- Check if audit_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
) as table_exists;

-- Check audit views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE '%audit%';

-- Test the log_credential_operation function
SELECT log_credential_operation(
  'CREDENTIAL_DELETE',
  'test-id'::uuid,
  auth.uid(),
  'test_type',
  'test_file.pdf'
);
```

### 4. Update Frontend

#### Install the hook

The `useAuditLog.ts` hook is already created at `src/hooks/useAuditLog.ts`.

#### Import in components

```typescript
import { useTeacherDeletionHistory } from '@/hooks/useAuditLog';
```

#### Use in components

```typescript
function TeacherCredentialStats() {
  const { history, loading } = useTeacherDeletionHistory();
  
  return (
    <div>
      {loading ? 'Loading...' : (
        <p>Total deletions: {history?.total_deletions}</p>
      )}
    </div>
  );
}
```

### 5. Update TeacherCredentials Component

Update the deletion handler to integrate with audit logging:

```typescript
async function handleConfirmDelete() {
  if (!selectedDocForDelete || !user) return;
  
  try {
    setIsDeleting(true);
    
    // 1. Create audit log entry
    const auditLogId = await supabase.rpc('log_credential_operation', {
      p_operation_type: 'CREDENTIAL_DELETE',
      p_credential_id: selectedDocForDelete.id,
      p_teacher_id: user.id,
      p_document_type: selectedDocForDelete.document_type,
      p_document_name: selectedDocForDelete.file_name,
      p_action_reason: 'Deleted by teacher'
    });

    // 2. Delete from storage and database (existing code)
    
    // 3. Mark audit log as completed
    await supabase.rpc('mark_audit_operation_completed', {
      p_log_id: auditLogId.data,
      p_status: 'SUCCESS'
    });
    
  } catch (error) {
    // Mark audit log as failed
    
    // Show error to user
  }
}
```

## Features

### 1. Automatic Audit Logging

When the migration deploys, a trigger is created on `verification_documents` that automatically logs:
- **Uploads** when documents are inserted
- **Status Changes** when documents are approved/rejected
- **Deletions** when documents are deleted

### 2. Views for Reporting

#### `sensitive_audit_activity`
Shows all sensitive operations (deletions, rejections)

```sql
SELECT * FROM sensitive_audit_activity LIMIT 10;
```

#### `teacher_credential_deletion_history`
Shows deletion summary per teacher

```sql
SELECT * FROM teacher_credential_deletion_history 
WHERE total_deletions > 0;
```

#### `admin_credential_activity`
Shows admin actions on credentials

```sql
SELECT * FROM admin_credential_activity;
```

### 3. Stored Functions

#### `log_credential_operation()`
Create a new audit log entry manually

```typescript
const { data, error } = await supabase.rpc('log_credential_operation', {
  p_operation_type: 'CREDENTIAL_DELETE',
  p_credential_id: '123e4567-e89b-12d3-a456-426614174000',
  p_teacher_id: user.id,
  p_document_type: 'national_id',
  p_document_name: 'id.pdf',
  p_action_reason: 'Temporary deletion to upload new version',
  p_metadata: JSON.stringify({ reason_code: 'UPDATE' })
});
```

#### `mark_audit_operation_completed()`
Mark an operation as complete with status

```typescript
await supabase.rpc('mark_audit_operation_completed', {
  p_log_id: logId,
  p_status: 'SUCCESS',
  p_error_message: null
});
```

## Hooks Reference

### useTeacherAuditLogs()

Fetch all audit logs for a specific teacher

```typescript
const { logs, loading, error } = useTeacherAuditLogs(teacherId);
```

**Returns:**
- `logs`: Array of AuditLog objects
- `loading`: Boolean indicating fetch status
- `error`: Error object if fetch failed

### useTeacherDeletionHistory()

Fetch deletion summary for a teacher

```typescript
const { history, loading, error } = useTeacherDeletionHistory(teacherId);
```

**Returns:**
- `history`: DeletionHistory object with:
  - `total_deletions`: Total deletion count
  - `credential_deletions`: Credential-specific deletions
  - `most_recent_deletion`: Date of most recent deletion
  - `deleted_document_types`: Array of deleted types

### useCredentialDeletionLogs()

Fetch only credential deletion logs

```typescript
const { logs, loading, error } = useCredentialDeletionLogs(teacherId);
```

### useSensitiveAuditActivity()

Fetch all sensitive operations (admin use)

```typescript
const { activity, loading, error } = useSensitiveAuditActivity(limit);
```

### useTeacherDeletionPatterns()

Check if teacher has suspicious deletion patterns

```typescript
const { isSuspicious, deletionCount, loading, error } = useTeacherDeletionPatterns(
  teacherId,
  suspiciousDeletionThreshold  // default: 3 deletions in 30 days
);
```

### useAuditLogsByOperation()

Fetch audit logs filtered by operation type

```typescript
const { logs, loading, error } = useAuditLogsByOperation('CREDENTIAL_DELETE', limit);
```

## Admin Dashboard Integration

### Display Deletion Statistics

```typescript
function CredentialDeletionStats() {
  const { activity, loading } = useSensitiveAuditActivity(50);
  
  const deletionCount = activity?.filter(
    a => a.operation_type === 'CREDENTIAL_DELETE'
  ).length || 0;
  
  return <div>Credential Deletions: {deletionCount}</div>;
}
```

### Flag Teachers with Suspicious Patterns

```typescript
function SuspiciousTeachersList() {
  const { activity } = useSensitiveAuditActivity();
  
  // Group deletions by teacher
  const deletionsByTeacher = activity
    .filter(a => a.operation_type === 'CREDENTIAL_DELETE')
    .reduce((acc, a) => {
      acc[a.teacher_id] = (acc[a.teacher_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  // Find teachers with > 3 deletions in 30 days
  const suspicious = Object.entries(deletionsByTeacher)
    .filter(([_, count]) => count >= 3)
    .map(([id, count]) => ({ id, count }));
  
  return (
    <div>
      {suspicious.map(t => (
        <div key={t.id}>{t.id}: {t.count} deletions</div>
      ))}
    </div>
  );
}
```

## Monitoring & Alerts

### Set Up Email Alerts for Deletions

Create a Supabase Edge Function that triggers on new deletion logs:

```typescript
// supabase/functions/credential-deletion-alert/index.ts

export const handler = async (request: Request) => {
  const { record } = await request.json();
  
  if (record.operation_type === 'CREDENTIAL_DELETE') {
    // Send email alert to admins
    // Send Slack notification
    // Create escalation ticket
  }
  
  return { success: true };
};
```

Register the function in `supabase/functions.yaml`:

```yaml
functions:
  - name: credential-deletion-alert
    events:
      - type: postgres
        schema: public
        table: audit_logs
        event: INSERT
```

### Set Up Hooks for Suspicious Patterns

Use the `useTeacherDeletionPatterns()` hook in admin dashboard:

```typescript
function AdminDashboard() {
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [suspiciousTeachers, setSuspiciousTeachers] = useState<string[]>([]);
  
  // Check each teacher
  for (const teacherId of allTeachers) {
    const { isSuspicious } = useTeacherDeletionPatterns(teacherId);
    if (isSuspicious) {
      setSuspiciousTeachers(prev => [...prev, teacherId]);
    }
  }
  
  return (
    <div>
      <h2>Suspicious Teachers ({suspiciousTeachers.length})</h2>
      {suspiciousTeachers.map(id => (
        <TeacherAlertCard key={id} teacherId={id} />
      ))}
    </div>
  );
}
```

## Troubleshooting

### RLS Policy Issues

If teachers cannot see their own audit logs:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'audit_logs';

-- Verify auth.uid() works
SELECT auth.uid();

-- Test policy manually
SELECT * FROM audit_logs 
WHERE teacher_id = auth.uid() 
LIMIT 1;
```

### Triggers Not Firing

If deletions aren't being logged:

```sql
-- Check trigger exists
SELECT * FROM pg_triggers 
WHERE tgname = 'verification_documents_audit_trigger';

-- Manually disable and re-enable
DROP TRIGGER verification_documents_audit_trigger ON verification_documents;
CREATE TRIGGER verification_documents_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON verification_documents
FOR EACH ROW
EXECUTE FUNCTION audit_verification_documents();

-- Test trigger manually
INSERT INTO verification_documents (...) VALUES (...);
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
```

### View Performance Issues

If queries are slow:

```sql
-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM sensitive_audit_activity LIMIT 100;

-- Refresh materialized views if they exist
REFRESH MATERIALIZED VIEW CONCURRENTLY sensitive_audit_activity;

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE tablename = 'audit_logs';
```

## Performance Considerations

### Data Retention

The audit log will grow indefinitely. Consider:

1. **Archive old records** (>1 year) to a separate table
2. **Partition by date** for faster queries
3. **Create indexes** on frequently queried columns
4. **Set up automated cleanup** for logs older than 7 years (if allowed by compliance)

### Query Optimization

```sql
-- Index for common queries
CREATE INDEX idx_audit_logs_teacher_operation 
ON audit_logs(teacher_id, operation_type, created_at DESC);

-- Partition by date (if many records)
CREATE TABLE audit_logs_2025_q1 PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

## Compliance & Reporting

### GDPR Compliance

The audit logs contain user data. Ensure:
- [ ] Data is encrypted in transit (HTTPS)
- [ ] Data is encrypted at rest (Supabase default)
- [ ] RLS policies prevent unauthorized access
- [ ] Admins can view user deletion requests

### SOC 2 Compliance

The system provides:
- ✅ Immutable audit logs (no updates/deletes allowed)
- ✅ Timestamped operations
- ✅ User identification (teacher_id)
- ✅ Detailed operation descriptions
- ✅ Error logging for failed operations

### Generate Compliance Reports

```sql
-- Credential deletion report
SELECT
  teacher_id,
  COUNT(*) as total_deletions,
  MIN(created_at) as first_deletion,
  MAX(created_at) as last_deletion,
  ARRAY_AGG(DISTINCT document_type) as deleted_types
FROM audit_logs
WHERE operation_type = 'CREDENTIAL_DELETE'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY teacher_id
ORDER BY total_deletions DESC;
```

## Support & Maintenance

### Regular Tasks

- [ ] Weekly: Check sensitive_audit_activity for unusual patterns
- [ ] Monthly: Generate deletion statistics
- [ ] Monthly: Review failed operations
- [ ] Quarterly: Archive old logs to cold storage
- [ ] Annually: Review retention policies

### Contact

For questions about audit logging:
- Email: dev-team@extraclasses.com
- Slack: #credential-management
- Docs: /docs/CREDENTIAL_MANAGEMENT_API.md
