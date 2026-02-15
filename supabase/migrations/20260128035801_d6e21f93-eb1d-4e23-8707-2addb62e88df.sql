-- Add account status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_updated_by UUID;

-- Enable realtime for reviews table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Enable realtime for messages table (if not already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Add admin policy to update any profile status (for blocking/suspending)
CREATE POLICY "Admins can update any profile status"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create complaints table for tracking bad behavior
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN ('inappropriate_behavior', 'fraud', 'harassment', 'no_show', 'poor_quality', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Policies for complaints
CREATE POLICY "Users can create complaints"
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();