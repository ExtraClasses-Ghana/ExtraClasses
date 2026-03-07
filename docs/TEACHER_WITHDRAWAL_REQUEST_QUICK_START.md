# TWR Management - Quick Start Guide

## 5-Minute Setup

### Step 1: Deploy the Migration
```bash
cd your-project
supabase db push
```

This applies `20260228000004_teacher_withdrawal_management_redesign.sql` that includes:
- Enhanced `teacher_withdrawals` table
- New `withdrawal_transactions` table for financial logging
- New `withdrawal_notifications` table for real-time alerts
- 8 RPC functions for admin withdrawal management
- Automatic triggers for transaction logging
- RLS policies for data security

### Step 2: Update Types
Types are already updated in `src/integrations/supabase/types.ts` with 8 new RPC functions.

No additional action needed - TypeScript will auto-complete all withdrawal functions.

### Step 3: Use the React Component
The redesigned `AdminTWR.tsx` is ready to use:

```typescript
import AdminTWRPage from '@/pages/admin/AdminTWR';

// Add to your admin routes
<Route path="/admin/withdrawals" element={<AdminTWRPage />} />
```

### Step 4: Access the Page
Navigate to `/admin/withdrawals` to see:
- Real-time withdrawal dashboard
- Status tabs (Pending, Approved, Processing, etc.)
- Withdrawal list with live updates
- Detail panel with admin actions
- Statistics cards with metrics

## Usage Examples

### Get All Pending Withdrawals
```typescript
const { withdrawals, loading } = useAdminWithdrawals(50, 0, 'pending');

withdrawals.forEach(w => {
  console.log(`${w.teacher_name}: ₵${w.amount} (${w.status})`);
});
```

### Approve a Withdrawal
```typescript
const { approveWithdrawal } = useWithdrawalActions();

const result = await approveWithdrawal(
  withdrawalId,
  'Approved - will process via Paystack'
);

if (result.success) {
  console.log('Withdrawal approved');
}
```

### Get Statistics
```typescript
const { stats } = useWithdrawalStats();

console.log(`Pending: ${stats.pending_count} (₵${stats.total_pending})`);
console.log(`Completed: ${stats.completed_count} (₵${stats.total_completed})`);
console.log(`Total Volume: ₵${stats.total_amount}`);
```

### View Notifications
```typescript
const { notifications, markAsRead } = useWithdrawalNotifications();

// Mark as read when admin views
notifications.forEach(notif => {
  if (!notif.is_read) {
    markAsRead(notif.notification_id);
  }
});
```

### Get Trends for Chart
```typescript
const { trends } = useWithdrawalTrends(30); // Last 30 days

// Perfect for Recharts LineChart
const data = trends.map(t => ({
  date: t.date,
  pending: t.pending_count,
  approved: t.approved_count,
  completed: t.completed_count,
}));
```

## Key Features at a Glance

| Feature | Benefit |
|---------|---------|
| **Real-Time Updates** | Dashboard refreshes instantly when other admins make changes |
| **Financial Logging** | Every withdrawal action creates immutable transaction record |
| **Automatic Notifications** | Teachers notified at each stage (approve, reject, process, complete) |
| **Admin Tracking** | See which admin processed each withdrawal (admin_id) |
| **Audit Trail** | Complete history in withdrawal_transactions + withdrawal_notifications |
| **RLS Protection** | Teachers cannot see other teachers' withdrawals |
| **Status Pipeline** | Clear workflow: pending → approved → processing → completed/rejected |

## Status Workflow Diagram

```
┌─────────────────────────────┐
│  Teacher Submits Request    │
└──────────────┬──────────────┘
               │
        (PENDING status)
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐        ┌────▼──────┐
│  Approve  │        │   Reject   │
└────┬─────┘        └────┬───────┘
     │                   │
  APPROVED          REJECTED
     │                   │
┌────▼──────────┐   (End with notification)
│   Process      │
└────┬───────────┘
     │
PROCESSING
     │
┌────▼──────────┐
│   Complete     │
└────┬───────────┘
     │
  COMPLETED
   (End with notification)
```

## Common Tasks

### Process a Withdrawal from Start to Finish

```typescript
import { useWithdrawalActions } from '@/hooks/useWithdrawalManagement';

const { 
  approveWithdrawal, 
  processWithdrawal, 
  completeWithdrawal 
} = useWithdrawalActions();

// Step 1: Review and approve
await approveWithdrawal(withdrawalId, 'Approved for payment');

// Step 2: Send to payment gateway
await processWithdrawal(
  withdrawalId,
  'Paystack',           // payment_gateway
  'ps_ref_12345'        // reference_number
);

// Step 3: After payment confirms, mark complete
await completeWithdrawal(
  withdrawalId,
  'ps_txn_confirmed_789' // external_reference
);

// System automatically:
// - Logs each step in withdrawal_transactions
// - Creates notifications for teacher
// - Updates status timestamps
// - Records admin_id for audit
```

### Reject a Withdrawal

```typescript
const { rejectWithdrawal } = useWithdrawalActions();

await rejectWithdrawal(
  withdrawalId,
  'Invalid account number - does not match registered banking details'
);

// Teacher receives notification with reason
// Can submit new withdrawal request with correct details
```

### Monitor Real-Time Activity

```typescript
const { withdrawals, loading, refetch } = useAdminWithdrawals(50, 0, 'pending');
const { stats } = useWithdrawalStats();

// Component renders automatically on updates
// Real-time subscriptions trigger refetch() when changes occur
// No polling needed - WebSocket-based updates

return (
  <div>
    <div>Pending: {stats?.pending_count}</div>
    <div>Total: ₵{stats?.total_amount}</div>
    <ul>
      {withdrawals.map(w => (
        <li key={w.withdrawal_id}>
          {w.teacher_name}: ₵{w.amount}
        </li>
      ))}
    </ul>
  </div>
);
```

## Database Structure Summary

### Three Core Tables

1. **teacher_withdrawals** (Enhanced)
   - Request details (amount, method, status)
   - Timestamps (approved_at, rejected_at, completed_at)
   - Admin info (admin_id, processed_by)
   - Additional fields (payment_method, bank_name, mobile_network)

2. **withdrawal_transactions** (New)
   - Financial audit log
   - Status changes tracked
   - Payment gateway integration
   - External reference tracking
   - Error logging for failed transactions

3. **withdrawal_notifications** (New)
   - Admin alerts on pending reviews
   - Teacher notifications on status changes
   - Read/unread tracking
   - Flexible metadata storage

### Key Relationships

```
teacher_withdrawals
  ├─ teacher_id → auth.users
  ├─ admin_id → auth.users
  └─ Has many: withdrawal_transactions
  └─ Has many: withdrawal_notifications

withdrawal_transactions
  ├─ withdrawal_id → teacher_withdrawals
  └─ teacher_id → auth.users

withdrawal_notifications
  ├─ withdrawal_id → teacher_withdrawals
  ├─ teacher_id → auth.users
  └─ admin_id → auth.users
```

## Troubleshooting

### No withdrawals showing on dashboard
- [ ] Migration deployed? `supabase db list-migrations`
- [ ] Admin user has correct role? Check `user_roles` table
- [ ] Firebase/Auth user matches database?

### "Insufficient privileges" error
- [ ] Make sure logged-in user has `admin` role
- [ ] Check `user_roles` table: `WHERE user_id = current_user_id AND role = 'admin'`

### Real-time updates not working
- [ ] Check browser WebSocket connection (DevTools → Network)
- [ ] Verify Supabase realtime is enabled in project
- [ ] Check for subscription cleanup on component unmount

### Cannot approve withdrawal
- [ ] Withdrawal must be in `pending` status only
- [ ] Check current status in detail panel
- [ ] If rejected/approved already, cannot change

## API Reference Summary

### Withdrawal Management
- `get_admin_withdrawals_list()` - Fetch withdrawals
- `approve_withdrawal(id, notes)` - Approve pending
- `reject_withdrawal(id, reason)` - Reject pending
- `process_withdrawal(id, gateway, ref)` - Start processing
- `complete_withdrawal(id, external_ref)` - Mark complete

### Notifications
- `get_admin_withdrawal_notifications()` - Get alert list
- `mark_notification_read(id)` - Mark as read

### Analytics
- `get_withdrawal_statistics()` - Dashboard metrics
- `get_withdrawal_trends(days)` - Time-series data

## Next Steps

1. ✅ Deploy migration
2. ✅ Navigate to `/admin/withdrawals`
3. ✅ Test approving/rejecting a withdrawal
4. ✅ Verify real-time updates work
5. ⏭️ (Optional) Integrate with payment gateway webhooks
6. ⏭️ (Optional) Add withdrawal scheduling feature
7. ⏭️ (Optional) Implement withdrawal appeals process

## Performance Tips

- Use pagination: `limit=50, offset=0` for large datasets
- Filter by status: `filter_status='pending'` to reduce data
- Subscribe only to relevant channels
- Unsubscribe from channels on component unmount
- Cache stats for 5-10 seconds to reduce API calls

## Support Resources

- Full documentation: See `TEACHER_WITHDRAWAL_REQUEST_MANAGEMENT.md`
- Hook examples: Check `src/hooks/useWithdrawalManagement.ts`
- Component implementation: See `src/pages/admin/AdminTWR.tsx`
- Database schema: Review `supabase/migrations/20260228000004_*`
