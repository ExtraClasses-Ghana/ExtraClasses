-- Add teacher_withdrawals table

CREATE TABLE IF NOT EXISTS public.teacher_withdrawals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'GHS',
  method text,
  account_details text,
  status text DEFAULT 'pending',
  admin_notes text,
  processed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_teacher_id ON public.teacher_withdrawals (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_status ON public.teacher_withdrawals (status);
