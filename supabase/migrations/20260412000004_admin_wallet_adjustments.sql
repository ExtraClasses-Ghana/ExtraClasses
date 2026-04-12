CREATE TABLE IF NOT EXISTS public.admin_wallet_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL, -- positive for credit, negative for debit
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_wallet_adjustments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything on admin_wallet_adjustments"
    ON public.admin_wallet_adjustments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Teachers can view their own
CREATE POLICY "Teachers can view their own adjustments"
    ON public.admin_wallet_adjustments
    FOR SELECT
    USING (teacher_id = auth.uid());
