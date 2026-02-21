# Secure Credential Management

## Overview

The Secure Credential Management feature protects the integrity of teacher verification documents by preventing accidental or unintended deletion with a comprehensive warning system and audit logging.

## Features Implemented

### 1. Delete Button for Each Credential
- Located on the "My Credentials" page (TeacherCredentials component)
- Only visible for uploaded documents
- Disabled during upload/update operations for safety
- Clear visual indication (trash icon)

### 2. High-Severity Warning Modal

When a teacher clicks the Delete button, a warning modal displays with:

**Visual Indicators:**
- Alert icon in destructive red color
- "WARNING: Delete Credential" title in destructive color
- Red border and destructive background tint

**Warning Content:**
```
"Deleting required credentials may lead to immediate account suspension 
and removal from teacher listings."
```

**Action Details Listed:**
- Cannot be undone
- Will be permanently logged
- May trigger account review by administrators
- Could result in loss of teaching access

**Button Labels:**
- "Keep Credential" (safe option, default focus)
- "Yes, Delete Credential" (requires explicit confirmation)

### 3. Deletion Process

The deletion follows a multi-step process:

1. **User Confirmation**: Teacher must explicitly click the delete button in the modal
2. **Storage Cleanup**: Remove file from Supabase Storage
3. **Database Cleanup**: Remove verification document record
4. **Audit Logging**: Log the action in admin_notifications table
5. **User Notification**: Toast notification confirms deletion and alerts user that admin will review

### 4. Comprehensive Audit Logging

All deletions are logged in the `admin_notifications` table with:
- **type**: `"new_report"` (flagged for admin attention)
- **title**: `"Credential Deleted"`
- **message**: Details of what was deleted and that it was logged
- **related_user_id**: Teacher's user ID
- **related_entity_id**: Document ID that was deleted
- **timestamp**: Automatically recorded via `created_at`

## Component Structure

### CredentialDeleteWarning.tsx
Located at: `src/components/teacher/CredentialDeleteWarning.tsx`

**Props:**
```typescript
{
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  documentType: string;
  isDeleting?: boolean;
}
```

**Features:**
- AlertDialog from shadcn/ui for accessibility
- Disabled actions during deletion to prevent double-clicks
- Clear visual hierarchy with destructive styling
- Responsive button layout

### TeacherCredentials.tsx
Updated at: `src/pages/dashboard/TeacherCredentials.tsx`

**New State Variables:**
```typescript
const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
const [selectedDocForDelete, setSelectedDocForDelete] = useState<VerificationDoc | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

**New Functions:**
- `handleDeleteClick(doc)`: Opens warning modal with selected document
- `handleConfirmDelete()`: Executes deletion with logging
- `handleCancelDelete()`: Closes modal without changes

**Delete Flow:**
1. Extract file path from storage URL
2. Delete from Supabase Storage (continues even if fails)
3. Delete from verification_documents table
4. Create admin notification for logging
5. Update UI state
6. Show toast notification

## Security Considerations

### 1. Explicit Confirmation Required
- Modal must be manually confirmed
- Cannot proceed with keyboard shortcuts
- Button states prevent accidental clicks during processing

### 2. Irreversible Action
- Files are permanently deleted from storage
- Database records are hard-deleted (not soft-deleted)
- No recovery option after confirmation

### 3. Audit Trail
- All deletions logged in admin_notifications
- Logged with user ID and document ID for tracking
- Admin dashboard can review credential deletions

### 4. Account Impact Protection
- Toast notification warns that admin will review
- System alert in modal explains possible account suspension
- Deletion triggers admin notifications for immediate review

## Database Schema

The feature uses existing tables:

### verification_documents
```sql
- id (UUID)
- teacher_id (UUID)
- document_type (TEXT)
- file_name (TEXT)
- file_url (TEXT)
- status (TEXT: pending, approved, rejected)
- admin_notes (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### admin_notifications
```sql
- id (UUID)
- type (TEXT: new_report)
- title (TEXT)
- message (TEXT)
- related_user_id (UUID)
- related_entity_id (UUID)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)
```

### Storage (verification-documents bucket)
- Contains uploaded verification documents
- Path format: `{user_id}/{document_type}-{timestamp}.{ext}`
- Public URLs point to stored files

## User Experience Flow

### For Teachers:
1. View uploaded credentials on "My Credentials" page
2. See delete button (trash icon) on each document
3. Click delete button
4. Warning modal appears with detailed warnings
5. Choose "Keep Credential" to cancel or "Yes, Delete Credential" to confirm
6. Deletion completes with toast notification
7. Credential removed from list
8. Admin is notified to review account status

### For Admins:
1. Notification appears in admin dashboard
2. Can review which teachers are deleting credentials
3. Can take appropriate action (suspend, review, contact)
4. Deletion information linked to specific document and teacher

## Error Handling

**Storage Deletion Failure:**
- Continues to database deletion
- Logs error in console for debugging
- User is still notified of deletion
- File eventually cleaned up by storage rules

**Database Deletion Failure:**
- Shows error toast to user
- Deletion is not completed
- User can try again or contact support

**Logging Failure:**
- Deletion still completes
- Error logged to console
- Deletion still recorded in database (not in notifications)

## Admin Dashboard Integration

Admins can view credential deletions:
1. Admin Notifications page shows all deletions
2. Filter by type: "new_report"
3. Click on notification to see details
4. Related user ID allows viewing teacher profile
5. Related entity ID links to the deleted document ID

## Testing Checklist

- [ ] Delete button appears only for uploaded documents
- [ ] Delete button is disabled during upload/update
- [ ] Clicking delete opens warning modal
- [ ] Modal displays all warning elements
- [ ] Cannot close modal by clicking outside
- [ ] "Keep Credential" button cancels deletion
- [ ] "Yes, Delete Credential" button confirms deletion
- [ ] Deletion removes file from storage
- [ ] Deletion removes record from database
- [ ] Admin notification created for deletion
- [ ] Toast notification shows after deletion
- [ ] Credential removed from UI
- [ ] Error handling works for failed deletions
- [ ] isDeleting state prevents double-deletes
- [ ] Document type displays correctly in warning

## Future Enhancements

1. **Soft Delete Option**: Add flag to mark documents as deleted but recoverable
2. **Recovery Window**: Allow teachers to restore within 7 days with admin approval
3. **Detailed Audit Log**: Create separate audit_logs table for fine-grained tracking
4. **Email Notifications**: Notify teacher and admin via email when credentials deleted
5. **Credential Recovery**: Allow teachers to request credential recovery with explanation
6. **Automatic Suspension**: System automatically suspends account after N credential deletions
7. **Admin Override**: Allow admins to delete credentials with different logging
8. **Credential Expiry**: Track when credentials expire and prompt renewal

## Troubleshooting

**Issue: Delete button not appearing**
- Solution: Verify document has status !== "pending" or check document exists in DB

**Issue: Deletion fails but toast shows success**
- Solution: Check browser console for errors, verify file path format

**Issue: Admin notification not created**
- Solution: Check Supabase permissions on admin_notifications table

**Issue: File remains in storage**
- Solution: May be cached, check Supabase storage dashboard directly
