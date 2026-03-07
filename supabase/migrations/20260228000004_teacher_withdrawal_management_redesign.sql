-- =============================================================================
-- Teacher Withdrawal Request (TWR) Management System Redesign
-- Migration: 20260228000004
--
-- Comprehensive redesign with:
-- - Financial transaction logging
-- - Real-time status tracking
-- - Admin notification system
-- - Audit trails
-- - Enhanced RLS policies
-- =============================================================================

-- ============================================================================
-- SECTION 1: ENHANCE WITHDRAWAL REQUESTS TABLE
-- ============================================================================

-- Add new columns to track workflow
ALTER TABLE public.teacher_withdrawals
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS mobile_network text,
ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_status_created ON public.teacher_withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_admin_id ON public.teacher_withdrawals(admin_id);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_approved_at ON public.teacher_withdrawals(approved_at DESC)
  WHERE status = 'approved';

-- ============================================================================
-- SECTION 2: FINANCIAL TRANSACTION LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.teacher_withdrawals(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('request', 'approval', 'rejection', 'processing', 'completion', 'failed')),
  amount numeric(12, 2) NOT NULL,
  currency text DEFAULT 'GHS',
  transaction_status text NOT NULL CHECK (transaction_status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  payment_gateway text,
  reference_number text,
  external_reference text UNIQUE,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_withdrawal_id ON public.withdrawal_transactions(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_teacher_id ON public.withdrawal_transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_created_at ON public.withdrawal_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_status ON public.withdrawal_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_external_ref ON public.withdrawal_transactions(external_reference);

-- ============================================================================
-- SECTION 3: ADMIN NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.teacher_withdrawals(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('pending_review', 'approved', 'rejected', 'processing', 'completed')),
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_notifications_withdrawal_id ON public.withdrawal_notifications(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_notifications_admin_id ON public.withdrawal_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_notifications_teacher_id ON public.withdrawal_notifications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_notifications_created_at ON public.withdrawal_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_notifications_is_read ON public.withdrawal_notifications(is_read, admin_id);

-- ============================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.withdrawal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_notifications ENABLE ROW LEVEL SECURITY;

-- Teachers can only view their own withdrawal transactions
CREATE POLICY "Teachers view own withdrawal transactions" ON public.withdrawal_transactions FOR SELECT
  USING (auth.uid() = teacher_id);

-- Admins can view all withdrawal transactions
CREATE POLICY "Admins manage withdrawal transactions" ON public.withdrawal_transactions
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Teachers receive notifications about their withdrawals
CREATE POLICY "Teachers view own notifications" ON public.withdrawal_notifications FOR SELECT
  USING (auth.uid() = teacher_id OR auth.uid() = admin_id);

-- Only admins can create/manage notifications
CREATE POLICY "Admins manage notifications" ON public.withdrawal_notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update notifications" ON public.withdrawal_notifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- SECTION 5: TRIGGERS FOR AUTOMATIC LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_withdrawal_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_transaction_type text;
  v_old_status text := OLD.status;
  v_new_status text := NEW.status;
BEGIN
  -- Determine transaction type based on status change
  IF v_old_status IS DISTINCT FROM v_new_status THEN
    CASE v_new_status
      WHEN 'approved' THEN v_transaction_type := 'approval';
      WHEN 'rejected' THEN v_transaction_type := 'rejection';
      WHEN 'processing' THEN v_transaction_type := 'processing';
      WHEN 'completed' THEN v_transaction_type := 'completion';
      WHEN 'failed' THEN v_transaction_type := 'failed';
      ELSE v_transaction_type := 'request';
    END CASE;

    -- Log the transaction
    INSERT INTO public.withdrawal_transactions (
      withdrawal_id,
      teacher_id,
      transaction_type,
      amount,
      currency,
      transaction_status,
      metadata
    ) VALUES (
      NEW.id,
      NEW.teacher_id,
      v_transaction_type,
      NEW.amount,
      NEW.currency,
      'success',
      jsonb_build_object(
        'old_status', v_old_status,
        'new_status', v_new_status,
        'admin_notes', NEW.admin_notes,
        'processed_by', NEW.processed_by
      )
    );

    -- Update timestamps based on status
    IF v_new_status = 'approved' THEN
      NEW.approved_at := now();
    ELSIF v_new_status = 'rejected' THEN
      NEW.rejected_at := now();
    ELSIF v_new_status = 'completed' THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS trigger_log_withdrawal_transaction ON public.teacher_withdrawals;
CREATE TRIGGER trigger_log_withdrawal_transaction
  BEFORE UPDATE ON public.teacher_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_withdrawal_transaction();

-- Update withdrawal_transactions created_at timestamp
CREATE OR REPLACE FUNCTION public.update_withdrawal_transaction_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_withdrawal_transaction_timestamp ON public.withdrawal_transactions;
CREATE TRIGGER trigger_update_withdrawal_transaction_timestamp
  BEFORE UPDATE ON public.withdrawal_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_withdrawal_transaction_timestamp();

-- ============================================================================
-- SECTION 6: ADMIN WITHDRAWAL MANAGEMENT FUNCTIONS
-- ============================================================================

-- Get all withdrawal requests with teacher info
CREATE OR REPLACE FUNCTION public.get_admin_withdrawals(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  filter_status text DEFAULT NULL,
  filter_method text DEFAULT NULL
)
RETURNS TABLE (
  withdrawal_id uuid,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  amount numeric,
  currency text,
  status text,
  method text,
  payment_method text,
  mobile_network text,
  bank_name text,
  account_number text,
  admin_notes text,
  rejection_reason text,
  created_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  completed_at timestamp with time zone,
  transaction_count integer,
  last_transaction_type text,
  last_transaction_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tw.id,
    tw.teacher_id,
    p.full_name,
    p.email,
    tw.amount,
    tw.currency,
    tw.status,
    tw.method,
    tw.payment_method,
    tw.mobile_network,
    tw.bank_name,
    tw.account_number,
    tw.admin_notes,
    tw.rejection_reason,
    tw.created_at,
    tw.approved_at,
    tw.rejected_at,
    tw.completed_at,
    COUNT(DISTINCT wt.id)::integer as transaction_count,
    (array_agg(wt.transaction_type ORDER BY wt.created_at DESC))[1] as last_transaction_type,
    MAX(wt.created_at) as last_transaction_at
  FROM public.teacher_withdrawals tw
  LEFT JOIN public.profiles p ON p.user_id = tw.teacher_id
  LEFT JOIN public.withdrawal_transactions wt ON wt.withdrawal_id = tw.id
  WHERE (
    filter_status IS NULL 
    OR tw.status = filter_status
  )
  AND (
    filter_method IS NULL 
    OR tw.method = filter_method
  )
  GROUP BY tw.id, p.full_name, p.email
  ORDER BY tw.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Admin-gated wrapper
CREATE OR REPLACE FUNCTION public.get_admin_withdrawals_list(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  filter_status text DEFAULT NULL,
  filter_method text DEFAULT NULL
)
RETURNS TABLE (
  withdrawal_id uuid,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  amount numeric,
  currency text,
  status text,
  method text,
  payment_method text,
  mobile_network text,
  bank_name text,
  account_number text,
  admin_notes text,
  rejection_reason text,
  created_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  completed_at timestamp with time zone,
  transaction_count integer,
  last_transaction_type text,
  last_transaction_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_admin_withdrawals(limit_count, offset_count, filter_status, filter_method);
END;
$$;

-- Approve withdrawal request
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  withdrawal_id uuid,
  approval_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_result jsonb;
BEGIN
  -- Get withdrawal details
  SELECT tw.* INTO v_withdrawal FROM public.teacher_withdrawals tw WHERE tw.id = withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  -- Update withdrawal status
  UPDATE public.teacher_withdrawals
  SET 
    status = 'approved',
    admin_id = auth.uid(),
    admin_notes = approval_notes,
    processed_by = 'admin'
  WHERE id = withdrawal_id
  RETURNING * INTO v_withdrawal;

  -- Create admin notification
  INSERT INTO public.withdrawal_notifications (
    withdrawal_id,
    teacher_id,
    admin_id,
    notification_type,
    title,
    message,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    auth.uid(),
    'approved',
    'Withdrawal Request Approved',
    'Your withdrawal request of ' || v_withdrawal.amount || ' ' || v_withdrawal.currency || ' has been approved and is being processed.',
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'currency', v_withdrawal.currency,
      'method', v_withdrawal.method,
      'approved_at', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal approved successfully',
    'withdrawal_id', withdrawal_id
  );

  RETURN v_result;
END;
$$;

-- Reject withdrawal request
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  withdrawal_id uuid,
  rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_result jsonb;
BEGIN
  -- Get withdrawal details
  SELECT tw.* INTO v_withdrawal FROM public.teacher_withdrawals tw WHERE tw.id = withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only pending withdrawals can be rejected');
  END IF;

  -- Update withdrawal status
  UPDATE public.teacher_withdrawals
  SET 
    status = 'rejected',
    rejection_reason = rejection_reason,
    admin_id = auth.uid(),
    processed_by = 'admin'
  WHERE id = withdrawal_id
  RETURNING * INTO v_withdrawal;

  -- Create rejection notification
  INSERT INTO public.withdrawal_notifications (
    withdrawal_id,
    teacher_id,
    admin_id,
    notification_type,
    title,
    message,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    auth.uid(),
    'rejected',
    'Withdrawal Request Rejected',
    'Your withdrawal request of ' || v_withdrawal.amount || ' ' || v_withdrawal.currency || ' has been rejected. Reason: ' || rejection_reason,
    jsonb_build_object(
      'rejection_reason', rejection_reason,
      'amount', v_withdrawal.amount,
      'currency', v_withdrawal.currency,
      'rejected_at', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal rejected successfully',
    'withdrawal_id', withdrawal_id
  );

  RETURN v_result;
END;
$$;

-- Process withdrawal (mark as processing)
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  withdrawal_id uuid,
  payment_gateway text DEFAULT NULL,
  reference_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_result jsonb;
BEGIN
  -- Get withdrawal details
  SELECT tw.* INTO v_withdrawal FROM public.teacher_withdrawals tw WHERE tw.id = withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_withdrawal.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only approved withdrawals can be processed');
  END IF;

  -- Update withdrawal status
  UPDATE public.teacher_withdrawals
  SET 
    status = 'processing',
    admin_id = auth.uid()
  WHERE id = withdrawal_id
  RETURNING * INTO v_withdrawal;

  -- Log transaction
  INSERT INTO public.withdrawal_transactions (
    withdrawal_id,
    teacher_id,
    transaction_type,
    amount,
    currency,
    transaction_status,
    payment_gateway,
    reference_number,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    'processing',
    v_withdrawal.amount,
    v_withdrawal.currency,
    'pending',
    payment_gateway,
    reference_number,
    jsonb_build_object(
      'payment_gateway', payment_gateway,
      'reference_number', reference_number,
      'processing_started_at', now()
    )
  );

  -- Create processing notification
  INSERT INTO public.withdrawal_notifications (
    withdrawal_id,
    teacher_id,
    admin_id,
    notification_type,
    title,
    message,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    auth.uid(),
    'processing',
    'Withdrawal Processing',
    'Your withdrawal of ' || v_withdrawal.amount || ' ' || v_withdrawal.currency || ' is now being processed to ' || v_withdrawal.method || '.',
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'currency', v_withdrawal.currency,
      'method', v_withdrawal.method,
      'payment_gateway', payment_gateway,
      'reference_number', reference_number
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal processing started',
    'withdrawal_id', withdrawal_id
  );

  RETURN v_result;
END;
$$;

-- Complete withdrawal (mark as completed)
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  withdrawal_id uuid,
  external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_result jsonb;
BEGIN
  -- Get withdrawal details
  SELECT tw.* INTO v_withdrawal FROM public.teacher_withdrawals tw WHERE tw.id = withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_withdrawal.status <> 'processing' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only processing withdrawals can be completed');
  END IF;

  -- Update withdrawal status
  UPDATE public.teacher_withdrawals
  SET 
    status = 'completed',
    admin_id = auth.uid()
  WHERE id = withdrawal_id
  RETURNING * INTO v_withdrawal;

  -- Log transaction
  INSERT INTO public.withdrawal_transactions (
    withdrawal_id,
    teacher_id,
    transaction_type,
    amount,
    currency,
    transaction_status,
    external_reference,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    'completion',
    v_withdrawal.amount,
    v_withdrawal.currency,
    'success',
    external_reference,
    jsonb_build_object(
      'external_reference', external_reference,
      'completed_at', now()
    )
  );

  -- Create completion notification
  INSERT INTO public.withdrawal_notifications (
    withdrawal_id,
    teacher_id,
    admin_id,
    notification_type,
    title,
    message,
    metadata
  ) VALUES (
    withdrawal_id,
    v_withdrawal.teacher_id,
    auth.uid(),
    'completed',
    'Withdrawal Completed',
    'Your withdrawal of ' || v_withdrawal.amount || ' ' || v_withdrawal.currency || ' has been successfully transferred to your ' || v_withdrawal.method || '.',
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'currency', v_withdrawal.currency,
      'method', v_withdrawal.method,
      'external_reference', external_reference,
      'completed_at', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal completed successfully',
    'withdrawal_id', withdrawal_id
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 7: NOTIFICATION MANAGEMENT
-- ============================================================================

-- Get admin notifications
CREATE OR REPLACE FUNCTION public.get_admin_withdrawal_notifications(
  admin_id uuid DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  notification_id uuid,
  withdrawal_id uuid,
  teacher_name text,
  amount numeric,
  currency text,
  notification_type text,
  title text,
  message text,
  is_read boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wn.id,
    wn.withdrawal_id,
    p.full_name,
    tw.amount,
    tw.currency,
    wn.notification_type,
    wn.title,
    wn.message,
    wn.is_read,
    wn.created_at
  FROM public.withdrawal_notifications wn
  LEFT JOIN public.teacher_withdrawals tw ON tw.id = wn.withdrawal_id
  LEFT JOIN public.profiles p ON p.user_id = tw.teacher_id
  WHERE wn.admin_id = COALESCE(admin_id, auth.uid())
  ORDER BY wn.is_read ASC, wn.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.withdrawal_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE id = notification_id
    AND (admin_id = auth.uid() OR teacher_id = auth.uid());

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Notification marked as read'
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 8: ANALYTICS FUNCTIONS
-- ============================================================================

-- Get withdrawal statistics
CREATE OR REPLACE FUNCTION public.get_withdrawal_statistics()
RETURNS TABLE (
  total_pending numeric,
  total_approved numeric,
  total_rejected numeric,
  total_completed numeric,
  total_amount numeric,
  average_amount numeric,
  pending_count integer,
  approved_count integer,
  rejected_count integer,
  completed_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as total_rejected,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(AVG(amount)::numeric(12, 2), 0) as average_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END)::integer as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END)::integer as rejected_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed_count
  FROM public.teacher_withdrawals;
$$;

-- Get withdrawal status trends
CREATE OR REPLACE FUNCTION public.get_withdrawal_trends(days_back integer DEFAULT 30)
RETURNS TABLE (
  date date,
  pending_count integer,
  approved_count integer,
  rejected_count integer,
  completed_count integer,
  total_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    DATE(tw.created_at) as date,
    COUNT(CASE WHEN tw.status = 'pending' THEN 1 END)::integer as pending_count,
    COUNT(CASE WHEN tw.status = 'approved' THEN 1 END)::integer as approved_count,
    COUNT(CASE WHEN tw.status = 'rejected' THEN 1 END)::integer as rejected_count,
    COUNT(CASE WHEN tw.status = 'completed' THEN 1 END)::integer as completed_count,
    SUM(tw.amount)::numeric(12, 2) as total_amount
  FROM public.teacher_withdrawals tw
  WHERE tw.created_at >= now() - (days_back || ' days')::interval
  GROUP BY DATE(tw.created_at)
  ORDER BY date DESC;
$$;

-- ============================================================================
-- SECTION 9: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_admin_withdrawals(integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_withdrawals_list(integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_withdrawal_notifications(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_trends(integer) TO authenticated;

-- ============================================================================
-- SECTION 10: DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.withdrawal_transactions IS 'Comprehensive financial transaction log for all withdrawal operations';
COMMENT ON TABLE public.withdrawal_notifications IS 'Real-time notifications for admin and teacher status updates';
COMMENT ON FUNCTION public.get_admin_withdrawals_list(integer, integer, text, text) IS 'Get all withdrawal requests with teacher info and transaction history (admin-gated)';
COMMENT ON FUNCTION public.approve_withdrawal(uuid, text) IS 'Approve a pending withdrawal and create notifications';
COMMENT ON FUNCTION public.reject_withdrawal(uuid, text) IS 'Reject a pending withdrawal with reason';
COMMENT ON FUNCTION public.process_withdrawal(uuid, text, text) IS 'Mark withdrawal as processing and log transaction';
COMMENT ON FUNCTION public.complete_withdrawal(uuid, text) IS 'Mark withdrawal as completed and send notification';
