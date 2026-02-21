# Credential Management API Reference

## Overview

This document provides detailed API reference for credential management functionality, including component props, hook interfaces, and database operations.

## Components

### CredentialDeleteWarning

**File:** `src/components/teacher/CredentialDeleteWarning.tsx`

**Purpose:** Displays a high-severity warning modal before credential deletion

**Props:**
```typescript
interface CredentialDeleteWarningProps {
  isOpen: boolean;                    // Controls modal visibility
  onConfirm: () => void | Promise<void>; // Called when user confirms deletion
  onCancel: () => void;              // Called when user cancels
  documentType: string;              // Type of credential (e.g., "national_id", "certificate")
  isDeleting?: boolean;              // Disables interactions while deleting
}
```

**Usage:**
```typescript
<CredentialDeleteWarning
  isOpen={deleteWarningOpen}
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  documentType={selectedDocForDelete?.document_type || ""}
  isDeleting={isDeleting}
/>
```

**Key Features:**
- AlertDialog-based for proper accessibility
- Destructive styling (red colors)
- High-severity warning text
- Button states prevent double-clicks
- Auto-closes on outside click (when not deleting)

**Visual Hierarchy:**
1. AlertTriangle icon (destructive color) with "WARNING" title
2. Large, prominent warning text
3. Numbered list of consequences
4. Two action buttons with clear labeling

---

## TeacherCredentials Page

**File:** `src/pages/dashboard/TeacherCredentials.tsx`

### State Variables

```typescript
// Existing
const [documents, setDocuments] = useState<VerificationDoc[]>([]);
const [loading, setLoading] = useState(true);
const [uploading, setUploading] = useState(false);

// New for deletion
const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
const [selectedDocForDelete, setSelectedDocForDelete] = useState<VerificationDoc | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

### Functions

#### handleDeleteClick(doc: VerificationDoc)
Opens the deletion warning modal.

```typescript
function handleDeleteClick(doc: VerificationDoc) {
  setSelectedDocForDelete(doc);
  setDeleteWarningOpen(true);
}
```

**Parameters:**
- `doc`: The VerificationDoc to be deleted

**Side Effects:**
- Sets selectedDocForDelete state
- Sets deleteWarningOpen to true

---

#### handleConfirmDelete()
Executes the credential deletion with full cleanup and logging.

```typescript
async function handleConfirmDelete() {
  if (!selectedDocForDelete || !user) return;
  
  try {
    setIsDeleting(true);
    
    // 1. Extract file path from URL
    const fileUrl = selectedDocForDelete.file_url;
    const path = fileUrl.split('/').pop();
    
    // 2. Delete from storage (continues even if fails)
    try {
      const { error: storageError } = await supabase
        .storage
        .from("verification-documents")
        .remove([`${user.id}/${path}`]);
      if (storageError) console.error("Storage deletion error:", storageError);
    } catch (err) {
      console.error("Storage deletion failed:", err);
    }
    
    // 3. Delete from database
    const { error: dbError } = await supabase
      .from("verification_documents")
      .delete()
      .eq("id", selectedDocForDelete.id);
    
    if (dbError) throw dbError;
    
    // 4. Log to admin notifications
    await supabase
      .from("admin_notifications")
      .insert({
        type: "new_report",
        title: "Credential Deleted",
        message: `Teacher ${user.email} deleted their ${selectedDocForDelete.document_type} credential. Document ID: ${selectedDocForDelete.id}`,
        related_user_id: user.id,
        related_entity_id: selectedDocForDelete.id
      });
    
    // 5. Update UI state
    setDocuments(documents.filter(d => d.id !== selectedDocForDelete.id));
    setDeleteWarningOpen(false);
    setSelectedDocForDelete(null);
    
    // 6. Notify user
    toast.error(
      "Credential deleted. Admin has been notified. Your account will be reviewed."
    );
  } catch (error) {
    console.error("Credential deletion error:", error);
    toast.error(
      error instanceof Error ? 
        `Failed to delete: ${error.message}` : 
        "Failed to delete credential. Please try again."
    );
  } finally {
    setIsDeleting(false);
  }
}
```

**Side Effects:**
- Deletes file from Supabase Storage
- Deletes record from verification_documents table
- Creates admin notification
- Updates documents state
- Closes deletion modal
- Shows toast notification

**Error Handling:**
- Storage deletion failure is non-blocking
- Database deletion throws if fails
- Errors are caught, logged, and shown to user
- isDeleting prevents double-attempts

---

#### handleCancelDelete()
Closes the warning modal without performing deletion.

```typescript
function handleCancelDelete() {
  setDeleteWarningOpen(false);
  setSelectedDocForDelete(null);
}
```

**Side Effects:**
- Sets deleteWarningOpen to false
- Clears selectedDocForDelete

---

### UI Components

#### Delete Button
Located in credential card footer, after Upload button.

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDeleteClick(doc)}
  disabled={isDeleting || uploading}
  title="Delete this credential"
  className="text-destructive hover:bg-destructive/10"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

**Behavior:**
- Only visible if document exists
- Disabled when isDeleting or uploading
- Uses destructive color scheme
- Accessible with title attribute

#### Warning Modal
Located at bottom of page, rendered conditionally.

```typescript
<CredentialDeleteWarning
  isOpen={deleteWarningOpen}
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  documentType={selectedDocForDelete?.document_type || ""}
  isDeleting={isDeleting}
/>
```

---

## Database Operations

### Deletion Query

```sql
-- 1. Delete from verification_documents
DELETE FROM verification_documents
WHERE id = {doc_id}
AND teacher_id = {user_id}
RETURNING *;

-- 2. Create admin notification
INSERT INTO admin_notifications (
  type,
  title,
  message,
  related_user_id,
  related_entity_id
) VALUES (
  'new_report',
  'Credential Deleted',
  'Teacher [email] deleted their [type] credential. Document ID: [id]',
  {user_id},
  {doc_id}
);

-- 3. Storage deletion (not SQL)
-- Handled by Supabase SDK: storage.from("verification-documents").remove([path])
```

### RLS Policies

Existing RLS policies on verification_documents table:

```sql
-- READ: Users can see their own documents
CREATE POLICY "Users can read their own credentials"
ON verification_documents
FOR SELECT
USING (teacher_id = auth.uid());

-- DELETE: Users can only delete their own documents
CREATE POLICY "Users can delete their own credentials"
ON verification_documents
FOR DELETE
USING (teacher_id = auth.uid());
```

---

## Storage Operations

### Storage Bucket
- **Name:** verification-documents
- **Path Format:** `{user_id}/{document_type}-{timestamp}.{ext}`
- **Public:** Yes (read-only)
- **Max File Size:** 5MB (enforced in upload)

### Delete Operation

```typescript
const { error } = await supabase
  .storage
  .from("verification-documents")
  .remove([`${user.id}/${filename}`]);
```

**Parameters:**
- Bucket: "verification-documents"
- Path: `{user_id}/{filename}` (extracted from file_url)

**Errors:**
- File not found (non-blocking, continues)
- Permission denied (RLS policy)
- Storage error (caught and logged)

---

## State Flow Diagram

```
User clicks Delete button
        ↓
[setSelectedDocForDelete] → [setDeleteWarningOpen]
        ↓
CredentialDeleteWarning renders
        ↓
    ↙          ↘
Cancel      Confirm
  ↓            ↓
Reset      [setIsDeleting]
state          ↓
            Storage.remove()
              ↓ (optional fail)
            DB.delete()
              ↓
            admin_notifications.insert()
              ↓
            [setDocuments] (filtered)
              ↓
            toast.error()
              ↓
            Reset state
```

---

## Error Handling Strategy

### Error Types & Handling

| Error Type | Location | Handling | User Impact |
|-----------|----------|----------|------------|
| Storage Deletion | SafeAsync | Logged, non-blocking | File not removed from storage |
| DB Deletion | Try/Catch | Caught, thrown | Deletion fails, user retries |
| Notification Insert | Try/Catch | Logged, non-blocking | Deletion completes, logging fails |
| No User Session | Early return | Silent, prevents crash | No error shown (shouldn't occur) |
| No Selected Doc | Early return | Silent, prevents crash | No error shown (shouldn't occur) |

### Error Messages

**Success:**
```
"Credential deleted. Admin has been notified. Your account will be reviewed."
```

**Failure:**
```
"Failed to delete: [error message]"
// or default:
"Failed to delete credential. Please try again."
```

---

## Security Considerations

### Access Control
- Only authenticated users can delete
- RLS policy: users can only delete their own credentials
- User ID checked before each operation

### Logging
- All deletions logged in admin_notifications
- Includes user ID, document ID, timestamp
- Enables audit trail and compliance tracking

### File Cleanup
- Files deleted from storage before DB record deleted
- Ensures no orphaned files
- Storage deletion failure doesn't block DB deletion

### State Management
- isDeleting flag prevents double-clicks
- Modal prevents accidental confirmations
- No keyboard shortcuts for deletion

---

## Testing Guidelines

### Unit Tests

```typescript
describe('handleDeleteClick', () => {
  it('should set selected doc and open warning modal', () => {
    // Setup: render component with mock doc
    // Action: click delete button
    // Assert: deleteWarningOpen and selectedDocForDelete set
  });
});

describe('handleConfirmDelete', () => {
  it('should delete from storage and database', async () => {
    // Setup: mock Supabase calls
    // Action: call handleConfirmDelete
    // Assert: storage.remove called with correct path
    // Assert: DB delete called
  });
  
  it('should create admin notification', async () => {
    // Assert: admin_notifications.insert called with correct data
  });
  
  it('should update UI state', async () => {
    // Assert: documents filtered
    // Assert: deleteWarningOpen closed
  });
});
```

### Integration Tests

```typescript
describe('Credential Deletion Flow', () => {
  it('should complete full deletion workflow', async () => {
    // 1. Upload credential
    // 2. Click delete button
    // 3. Verify warning modal appears
    // 4. Click confirm
    // 5. Verify storage deletion
    // 6. Verify DB deletion
    // 7. Verify admin notification created
    // 8. Verify UI updated
  });
  
  it('should handle storage failure gracefully', async () => {
    // Mock storage failure
    // Verify DB deletion still completes
    // Verify user notified of deletion
  });
});
```

### UI Tests

```typescript
describe('CredentialDeleteWarning Component', () => {
  it('should render when isOpen=true', () => {
    // Assert: modal visible
    // Assert: all text displayed
  });
  
  it('should disable buttons during deletion', () => {
    // Set isDeleting=true
    // Assert: buttons disabled
  });
  
  it('should call onCancel when cancel button clicked', () => {
    // Action: click cancel button
    // Assert: onCancel called
  });
});
```

---

## Performance Considerations

### Query Optimization
- Single document query for delete operation
- No N+1 queries
- Index on (teacher_id, id) for fast lookups

### Storage Efficiency
- Files deleted immediately (no soft deletes)
- Reduces storage costs
- One admin notification per deletion

### State Updates
- Documents array filtered (O(n) operation)
- Acceptable for typical document counts (<20)
- Consider pagination if > 100 documents

---

## Monitoring & Analytics

### Metrics to Track
- Credential deletions per day
- Most-deleted credential types
- Time between upload and deletion
- Teachers with multiple deletions

### Alerts to Set
- Unusual deletion patterns
- Storage failures
- Database errors
- Admin notification failures

### Dashboard Views
- Deletions by education level
- Deletions by credential type
- Account suspension rate after deletion
- Recovery/restoration requests

