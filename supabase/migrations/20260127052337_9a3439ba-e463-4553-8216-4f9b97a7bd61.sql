-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false);

-- Storage policies for verification documents
CREATE POLICY "Teachers can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND public.has_role(auth.uid(), 'admin'));

-- Create verification documents table
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'degree', 'teaching_certificate')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own documents"
ON public.verification_documents FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can upload documents"
ON public.verification_documents FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all documents"
ON public.verification_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documents"
ON public.verification_documents FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('new_teacher', 'verification_pending', 'payment_issue', 'new_report')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create system settings table for admin
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.system_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add onboarding_completed field to teacher_profiles
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected'));

-- Create trigger for updated_at on verification_documents
CREATE TRIGGER update_verification_documents_updated_at
BEFORE UPDATE ON public.verification_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify admin when teacher signs up
CREATE OR REPLACE FUNCTION public.notify_admin_new_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, related_user_id)
  VALUES (
    'new_teacher',
    'New Teacher Registration',
    'A new teacher has registered and needs verification.',
    NEW.user_id
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new teacher notification
CREATE TRIGGER on_teacher_profile_created
AFTER INSERT ON public.teacher_profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_teacher();

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
  ('platform_fee_percentage', '10'),
  ('minimum_hourly_rate', '20'),
  ('maximum_hourly_rate', '500'),
  ('verification_required', 'true')
ON CONFLICT (key) DO NOTHING;