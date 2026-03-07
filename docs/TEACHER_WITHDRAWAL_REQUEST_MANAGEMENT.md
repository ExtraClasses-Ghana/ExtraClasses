# Teacher Withdrawal Request (TWR) Management System

## Overview

The redesigned TWR Management System provides a comprehensive solution for handling teacher withdrawal requests with real-time tracking, financial logging, notification system integration, and complete audit trails.

## Key Features

### 1. Real-Time Withdrawal Request Tracking
- **Live Updates**: Changes to withdrawal requests are instantly reflected across all admin interfaces
- **Status Pipeline**: pending → approved → processing → completed/rejected
- **Transaction History**: Complete audit trail of all state changes with timestamps

### 2. Status Management
- **Pending**: Initial state when teacher submits withdrawal request
- **Approved**: Admin approves the request and schedules processing
- **Processing**: Payment gateway integration initiated
- **Completed**: Successfully transferred to teacher's account
- **Rejected**: Administrative rejection with documented reason

### 3. Financial Transaction Logging
- **Automatic Logging**: Every status change creates a transaction record
- **Payment Gateway Integration**: Support for multiple payment methods (MTN, Telecel, Airtel, Bank transfers)
- **External Reference Tracking**: Integration with payment gateway response tracking
- **Error Handling**: Failed transaction documentation with error messages

### 4. Admin Notification System
- **Real-Time Alerts**: Instant notifications for pending withdrawals
- **Status Notifications**: Teachers receive notifications when their withdrawal status changes
- **Read Tracking**: Admin notifications marked as read with timestamps
- **Notification Chains**: Automatic notifications on approval, rejection, processing, and completion

### 5. Row Level Security (RLS)
- **Teacher Privacy**: Teachers can only view their own withdrawal transactions
- **Admin Control**: Admins have full visibility into all withdrawals
- **Audit Trail Protection**: Withdrawal audit logs restricted to admin access only

## Database Structure

### Tables

#### `teacher_withdrawals` (Enhanced)
Original table extended with new columns:

```sql
ALTER TABLE teacher_withdrawals
ADD COLUMN rejection_reason text,
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN rejected_at timestamp with time zone,
ADD COLUMN completed_at timestamp with time zone,
ADD COLUMN payment_method text,
ADD COLUMN account_number text,
ADD COLUMN bank_name text,
ADD COLUMN mobile_network text,
ADD COLUMN admin_id uuid,
ADD COLUMN notification_sent boolean;
```

**Key Fields**:
- `status`: pending | approved | rejected | processing | completed | failed
- `admin_id`: References the admin who processed the withdrawal
- `amount`: Withdrawal amount in specified currency
- `currency`: Default 'GHS' (Ghanaian Cedi)
- `method`: Mobile network or bank transfer method
- `created_at`: Request timestamp
- `approved_at`: Admin approval timestamp
- `completed_at`: Payment completion timestamp

#### `withdrawal_transactions` (New)
Financial transaction log for every withdrawal operation:

```sql
CreateTable withdrawal_transactions (
  id uuid PRIMARY KEY,
  withdrawal_id uuid (FK) -- Links to teacher_withdrawals
  teacher_id uuid (FK) -- Links to auth.users
  transaction_type text -- request|approval|rejection|processing|completion|failed
  amount numeric(12,2),
  currency text,
  transaction_status text -- pending|success|failed
  payment_gateway text, -- Paystack, MTN, Telecel, etc.
  reference_number text, -- Internal reference
  external_reference text, -- Payment gateway reference (UNIQUE)
  error_message text, -- For failed transactions
  metadata jsonb, -- Flexible storage for transaction details
  created_at timestamp,
  updated_at timestamp,
  processed_at timestamp
)
```

**Indexes**:
- `withdrawal_id` + `teacher_id` for quick transaction lookup
- `created_at DESC` for time-series queries
- `external_reference` UNIQUE for idempotency

#### `withdrawal_notifications` (New)
Real-time notification system for withdrawal status updates:

```sql
CreateTable withdrawal_notifications (
  id uuid PRIMARY KEY,
  withdrawal_id uuid (FK),
  teacher_id uuid (FK),
  admin_id uuid (FK),
  notification_type text -- pending_review|approved|rejected|processing|completed
  title text,
  message text,
  metadata jsonb,
  is_read boolean,
  read_at timestamp,
  created_at timestamp,
  expires_at timestamp
)
```

**Indexes**:
- `admin_id` + `is_read` for quick inbox queries
- `created_at DESC` for notification feed

### Indexes
Added 5 performance indexes for optimal query speed:
1. `idx_teacher_withdrawals_status_created` - Status filtering with ordering
2. `idx_teacher_withdrawals_admin_id` - Admin action tracking
3. `idx_teacher_withdrawals_approved_at` - Approval timeline analysis
4. `idx_withdrawal_transactions_status` - Transaction status filtering
5. `idx_withdrawal_notifications_is_read` - Unread notification queries

## API Functions

### Core Withdrawal Management

#### `get_admin_withdrawals_list(limit, offset, filter_status, filter_method)`
Fetch paginated list of withdrawal requests with complete details.

**Parameters**:
- `limit_count` (integer, default 50): Number of records per page
- `offset_count` (integer, default 0): Pagination offset
- `filter_status` (text, optional): Filter by status (pending|approved|rejected|processing|completed)
- `filter_method` (text, optional): Filter by withdrawal method

**Returns**: Array of withdrawal details with transaction history

**Example**:
```javascript
const { data } = await supabase.rpc('get_admin_withdrawals_list', {
  limit_count: 20,
  offset_count: 0,
  filter_status: 'pending'
});
```

#### `approve_withdrawal(withdrawal_id, approval_notes)`
Approve a pending withdrawal request and trigger notification.

**Parameters**:
- `withdrawal_id` (uuid): ID of withdrawal to approve
- `approval_notes` (text, optional): Admin notes on approval

**Returns**: JSON object with success status

**Triggers**:
- Logs transaction in `withdrawal_transactions`
- Creates notification in `withdrawal_notifications`
- Sets `approved_at` timestamp
- Records `admin_id`

#### `reject_withdrawal(withdrawal_id, rejection_reason)`
Reject a pending withdrawal with mandatory reason.

**Parameters**:
- `withdrawal_id` (uuid): ID of withdrawal to reject
- `rejection_reason` (text): Why the withdrawal is being rejected

**Returns**: JSON object with success status

**Triggers**:
- Stores rejection reason in database
- Creates notification to teacher
- Logs rejection in transaction history
- Sets `rejected_at` timestamp

#### `process_withdrawal(withdrawal_id, payment_gateway, reference_number)`
Mark withdrawal as processing when payment gateway integration begins.

**Parameters**:
- `withdrawal_id` (uuid): ID of withdrawal to process
- `payment_gateway` (text, optional): Gateway name (Paystack, MTN, etc.)
- `reference_number` (text, optional): Gateway reference ID

**Returns**: JSON object with success status

**Triggers**:
- Updates status to 'processing'
- Logs transaction with gateway details
- Creates 'processing' notification

#### `complete_withdrawal(withdrawal_id, external_reference)`
Mark withdrawal as successfully completed in payment system.

**Parameters**:
- `withdrawal_id` (uuid): ID of withdrawal to complete
- `external_reference` (text, optional): Payment gateway confirmation reference

**Returns**: JSON object with success status

**Triggers**:
- Updates status to 'completed'
- Sets `completed_at` timestamp
- Logs completion transaction
- Creates 'completed' notification with success details

### Notification Management

#### `get_admin_withdrawal_notifications(admin_id, limit, offset)`
Fetch admin notifications about withdrawal status changes.

**Parameters**:
- `admin_id` (uuid, optional): Admin ID (defaults to current user)
- `limit_count` (integer, default 50): Results per page
- `offset_count` (integer, default 0): Pagination offset

**Returns**: Array of unread and recent notifications

#### `mark_notification_read(notification_id)`
Mark a specific notification as read.

**Parameters**:
- `notification_id` (uuid): ID of notification to mark as read

**Returns**: JSON object with success status

### Analytics Functions

#### `get_withdrawal_statistics()`
Get comprehensive withdrawal statistics.

**Returns**: Single object containing:
```javascript
{
  total_pending: number,
  total_approved: number,
  total_rejected: number,
  total_completed: number,
  total_amount: number,
  average_amount: number,
  pending_count: number,
  approved_count: number,
  rejected_count: number,
  completed_count: number
}
```

#### `get_withdrawal_trends(days_back)`
Get withdrawal trends for time-series visualization.

**Parameters**:
- `days_back` (integer, default 30): Number of days to analyze

**Returns**: Array of daily trend objects:
```javascript
{
  date: "2026-02-28",
  pending_count: 5,
  approved_count: 3,
  rejected_count: 1,
  completed_count: 8,
  total_amount: 5000.00
}
```

## React Hooks

### useAdminWithdrawals
Fetch and subscribe to withdrawal requests with real-time updates.

```typescript
const { withdrawals, loading, error, refetch } = useAdminWithdrawals(
  limit,           // Results per page (default 50)
  offset,          // Pagination offset (default 0)
  filterStatus,    // Optional status filter
  filterMethod     // Optional method filter
);
```

### useWithdrawalActions
Perform admin actions on withdrawals.

```typescript
const { 
  approveWithdrawal,
  rejectWithdrawal,
  processWithdrawal,
  completeWithdrawal
} = useWithdrawalActions();

// Usage
await approveWithdrawal(withdrawalId, 'Approved and scheduled');
await rejectWithdrawal(withdrawalId, 'Invalid account details');
await processWithdrawal(withdrawalId, 'Paystack', 'ref_12345');
await completeWithdrawal(withdrawalId, 'ext_ref_67890');
```

### useWithdrawalStats
Get real-time withdrawal statistics.

```typescript
const { stats, loading, error } = useWithdrawalStats();

// stats object:
// {
//   pending_count: 5,
//   total_pending: 2500.00,
//   ...
// }
```

### useWithdrawalNotifications
Fetch and manage admin notifications.

```typescript
const { notifications, loading, error, markAsRead } = useWithdrawalNotifications();

// Mark notification as read
await markAsRead(notificationId);
```

### useWithdrawalTrends
Analyze withdrawal trends over time.

```typescript
const { trends, loading, error } = useWithdrawalTrends(daysBack); // default 30 days
```

## UI Components

### AdminTWR Page Features

#### 1. Statistics Dashboard
Real-time metric cards showing:
- Pending withdrawals count and total amount
- Approved withdrawals count and total amount
- Completed withdrawals count and total amount
- Total volume and average withdrawal amount

#### 2. Tabbed Interface
Navigate between withdrawal statuses:
- **Pending**: Awaiting admin review
- **Approved**: Scheduled for processing
- **Processing**: Payment gateway integration
- **Completed**: Successfully transferred
- **Rejected**: Administrative rejections
- **All**: Complete view of all withdrawals

#### 3. Withdrawal List
Each withdrawal card displays:
- Amount and currency
- Teacher name and email
- Withdrawal method (Mobile Money or Bank)
- Request date
- Current status badge
- Transaction count
- Last transaction timestamp

#### 4. Detail Panel
When withdrawal selected:
- Full request details
- Payment method information (Network, Bank, Account)
- Transaction history
- Status-appropriate action buttons

#### 5. Action Dialogs
Context-specific dialogs for:
- **Approve**: Confirm approval with optional notes
- **Reject**: Provide mandatory rejection reason
- **Process**: Confirm payment gateway processing
- **Complete**: Confirm successful payment completion

## Trigger-Based Automation

### `log_withdrawal_transaction()` Trigger
Automatically logs a transaction record whenever a withdrawal status changes:

```sql
ON UPDATE teacher_withdrawals
BEFORE UPDATE
  ├─ Detects status change (old vs new)
  ├─ Creates withdrawal_transactions entry
  ├─ Stores metadata about the change
  ├─ Updates timestamps (approved_at, rejected_at, completed_at)
  └─ Records admin_id for audit trail
```

### Real-Time Subscriptions
React hooks automatically subscribe to table changes:
- Updates to `teacher_withdrawals` trigger list refresh
- Changes to `withdrawal_notifications` update notification feed
- Transaction logging happens transparently

## Row Level Security Policies

### `withdrawal_transactions`
- `SELECT`: Teachers view only their own; Admins view all
- `INSERT`: System-generated, restricted to SECURITY DEFINER functions

### `withdrawal_notifications`
- `SELECT`: Teachers view own; Admins view all associated notifications
- `INSERT/UPDATE`: Only admins via SECURITY DEFINER functions

### `teacher_withdrawals` (Existing)
- `SELECT`: Teachers view own; Admins view all
- `UPDATE`: Teachers update pending only; Admins can update any status

## Workflow Examples

### Scenario 1: Approve & Process

```typescript
// Teacher requests ₵500 withdrawal (pending)
// Admin reviews and approves
await approveWithdrawal(withdrawalId, 'Approved for Paystack processing');

// System creates notification: "Withdrawal Request Approved"
// Admin initiates payment gateway
await processWithdrawal(withdrawalId, 'Paystack', 'ps_ref_123');

// System logs transaction and sends 'processing' notification
// Payment gateway processes payment
// Admin confirms completion
await completeWithdrawal(withdrawalId, 'paystack_txn_abc789');

// System sends completion notification with confirmation
```

### Scenario 2: Reject & Notify

```typescript
// Teacher requests withdrawal with invalid account details
await rejectWithdrawal(
  withdrawalId, 
  'Account details do not match teacher profile. Please resubmit with correct information.'
);

// System logs rejection in transactions
// Teacher receives notification with reason
// Teacher can resubmit new withdrawal request
```

### Scenario 3: Real-Time Dashboard Monitoring

```typescript
// Admin monitors dashboard
const { withdrawals, loading } = useAdminWithdrawals();
const { stats } = useWithdrawalStats();

// When another admin approves a withdrawal elsewhere:
// 1. Real-time subscription triggers
// 2. Load function automatically called
// 3. UI updates instantly without page reload
// 4. Stats re-calculate automatically
```

## Deployment Steps

### 1. Apply Migration
```bash
supabase db push
# File: supabase/migrations/20260228000004_teacher_withdrawal_management_redesign.sql
```

### 2. Verify Functions
```bash
# In Supabase Dashboard, check Functions:
- get_admin_withdrawals_list ✓
- approve_withdrawal ✓
- reject_withdrawal ✓
- process_withdrawal ✓
- complete_withdrawal ✓
- get_withdrawal_statistics ✓
- get_withdrawal_trends ✓
```

### 3. Test 3. Test RLS Policies
```sql
-- Test as admin user
SELECT * FROM teacher_withdrawals; -- Should see all

-- Test as teacher user
SELECT * FROM teacher_withdrawals; -- Should see only own
```

### 4. Route Configuration
Add to `/admin` navigation:
```typescript
import AdminTWRPage from '@/pages/admin/AdminTWR';

// In router config
{
  path: '/admin/withdrawals',
  component: AdminTWRPage,
  requiresAuth: true,
  requiredRole: 'admin'
}
```

## Performance Optimization

### Pagination Strategy
- Default limit: 50 withdrawals per request
- Use offset-limit pagination for large datasets
- Indexes ensure `O(log n)` status filtering

### Real-Time Subscription Strategy
- Subscribes only to relevant tables
- Automatic cleanup on component unmount
- Debounced updates to prevent excessive re-renders

### Query Optimization
- All analytics functions use computed indexes
- Materialized timestamps prevent recalculation
- Left joins with transaction counts cached in temporary tables

## Error Handling

### Validation Errors
```typescript
// Rejection without reason
// Error: "Rejection reason is required"

// Approving already-approved withdrawal
// Error: "Only pending withdrawals can be approved"

// Processing non-approved withdrawal
// Error: "Only approved withdrawals can be processed"
```

### Permission Errors
```typescript
// Non-admin attempting withdrawal management
// EXCEPTION: "Insufficient privileges"
```

### Transaction Errors
```typescript
// Failed payment processing
// Logged in metadata: error_message, transaction_status: 'failed'
// Can be retried or manually investigated
```

## Future Enhancements

### Phase 2
- [ ] Payment gateway webhook integration
- [ ] Automated payment recovery for failed transactions
- [ ] Teacher appeal process for rejected withdrawals
- [ ] Bulk withdrawal processing

### Phase 3
- [ ] Withdrawal scheduling (e.g., "process every Friday")
- [ ] Multi-currency support with exchange rate logging
- [ ] Tax deduction integration
- [ ] Compliance reporting for audits

## Support

For issues or questions about the TWR System:
1. Check the API Functions section for correct parameter usage
2. Review RLS policies if getting "permission denied" errors
3. Check browser console for hook-related errors
4. Verify migration was applied: `supabase db list-migrations`
