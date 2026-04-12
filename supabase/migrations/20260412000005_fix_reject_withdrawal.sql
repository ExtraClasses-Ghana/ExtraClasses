-- Fix ambiguous rejection_reason column reference

DROP FUNCTION IF EXISTS public.reject_withdrawal(uuid, text);

CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  withdrawal_id uuid,
  p_rejection_reason text
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
    rejection_reason = p_rejection_reason,
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
    'Your withdrawal request of ' || v_withdrawal.amount || ' ' || v_withdrawal.currency || ' has been rejected. Reason: ' || p_rejection_reason,
    jsonb_build_object(
      'rejection_reason', p_rejection_reason,
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
