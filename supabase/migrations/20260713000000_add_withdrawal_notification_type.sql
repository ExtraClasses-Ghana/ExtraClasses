-- Drop old check constraint if it exists and add new one that supports teacher_withdrawal
ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_type_check 
  CHECK (type IN ('new_teacher', 'verification_pending', 'payment_issue', 'new_report', 'teacher_withdrawal'));
