-- =============================================================================
-- ExtraClass: SINGLE INITIAL MIGRATION – Run on fresh Supabase project only
-- Creates all tables, RLS, functions, triggers, and seed data in dependency order.
-- =============================================================================

-- 1) Enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- 2) Core tables (order matters for FKs)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  region TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
  status_reason TEXT,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  status_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  education_level TEXT CHECK (education_level IS NULL OR education_level IN ('Basic', 'JHS', 'SHS', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  education_sub_category TEXT CHECK (education_sub_category IS NULL OR education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  subjects TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  qualifications TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  teaching_mode TEXT DEFAULT 'both',
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  availability JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected')),
  achievements TEXT[] DEFAULT '{}',
  education_level TEXT CHECK (education_level IS NULL OR education_level IN ('Basic', 'JHS', 'SHS', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  education_sub_category TEXT CHECK (education_sub_category IS NULL OR education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  session_type TEXT NOT NULL DEFAULT 'online',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.favorite_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, teacher_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Verification & admin
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'facial_verification', 'degree', 'qualifications', 'teaching_certificate')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('new_teacher', 'verification_pending', 'payment_issue', 'new_report')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4) Education lookups & subjects
CREATE TABLE public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.education_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  topics TEXT[] DEFAULT '{}',
  teacher_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  education_level TEXT CHECK (education_level IS NULL OR education_level IN ('Basic', 'JHS', 'SHS', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  education_sub_category TEXT CHECK (education_sub_category IS NULL OR education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'PDF',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  level TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  is_free BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) Complaints, video, contact, presence, blocks, withdrawals, audit
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN ('inappropriate_behavior', 'fraud', 'harassment', 'no_show', 'poor_quality', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  teacher_joined BOOLEAN DEFAULT false,
  student_joined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.video_signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_session_id UUID NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice-candidate', 'join', 'leave', 'chat')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
  admin_notes TEXT,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id)
);

CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

CREATE TABLE public.teacher_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  method TEXT,
  account_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
  admin_notes TEXT,
  processed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CREDENTIAL_UPLOAD', 'CREDENTIAL_APPROVE', 'CREDENTIAL_REJECT', 'CREDENTIAL_UPDATE', 'CREDENTIAL_DELETE', 'CREDENTIAL_VIEW', 'DOCUMENT_DOWNLOAD')),
  credential_id UUID REFERENCES public.verification_documents(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type TEXT,
  document_name TEXT,
  action_reason TEXT,
  metadata JSONB DEFAULT NULL,
  ip_address INET,
  user_agent TEXT,
  status TEXT CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')) DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_sensitive BOOLEAN DEFAULT false
);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_education_level ON public.profiles(education_level);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_education_level ON public.teacher_profiles(education_level);
CREATE INDEX IF NOT EXISTS idx_subjects_education_level ON public.subjects(education_level);
CREATE INDEX IF NOT EXISTS idx_video_sessions_session_id ON public.video_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_room_code ON public.video_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_video_signaling_video_session ON public.video_signaling(video_session_id);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_teacher_id ON public.teacher_withdrawals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_status ON public.teacher_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_teacher_id ON public.audit_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON public.user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_sender ON public.typing_indicators(sender_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_receiver ON public.typing_indicators(receiver_id);

-- 7) Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_role public.app_role;
BEGIN
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  IF user_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (user_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_teacher()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, related_user_id)
  VALUES ('new_teacher', 'New Teacher Registration', 'A new teacher has registered and needs verification.', NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.messages WHERE expires_at IS NOT NULL AND expires_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.log_credential_operation(
  p_operation_type TEXT, p_credential_id UUID, p_teacher_id UUID, p_document_type TEXT, p_document_name TEXT,
  p_action_reason TEXT DEFAULT NULL, p_metadata JSONB DEFAULT NULL, p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (operation_type, credential_id, teacher_id, document_type, document_name, action_reason, metadata, ip_address, user_agent, is_sensitive)
  VALUES (p_operation_type, p_credential_id, p_teacher_id, p_document_type, p_document_name, p_action_reason, p_metadata, p_ip_address, p_user_agent,
    p_operation_type IN ('CREDENTIAL_DELETE', 'CREDENTIAL_REJECT'))
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_verification_documents()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_credential_operation('CREDENTIAL_DELETE', OLD.id, OLD.teacher_id, OLD.document_type, OLD.file_name, 'Document deleted by teacher');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_credential_operation(
      CASE WHEN NEW.status = 'approved' THEN 'CREDENTIAL_APPROVE' WHEN NEW.status = 'rejected' THEN 'CREDENTIAL_REJECT' ELSE 'CREDENTIAL_UPDATE' END,
      NEW.id, NEW.teacher_id, NEW.document_type, NEW.file_name, 'Status changed to: ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_credential_operation('CREDENTIAL_UPLOAD', NEW.id, NEW.teacher_id, NEW.document_type, NEW.file_name, 'Document uploaded');
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8) Triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_verification_documents_updated_at BEFORE UPDATE ON public.verification_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_teacher_profile_created AFTER INSERT ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_teacher();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_course_materials_updated_at BEFORE UPDATE ON public.course_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_sessions_updated_at BEFORE UPDATE ON public.video_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER verification_documents_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.verification_documents FOR EACH ROW EXECUTE FUNCTION public.audit_verification_documents();

-- 9) RLS – enable on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10) RLS policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile status" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view teacher profiles" ON public.teacher_profiles FOR SELECT USING (true);
CREATE POLICY "Teachers can update their own profile" ON public.teacher_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can insert their own profile" ON public.teacher_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = student_id OR auth.uid() = teacher_id);
CREATE POLICY "Students can create sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Session participants can update" ON public.sessions FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = teacher_id);

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = payer_id);
CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Students can view their favorites" ON public.favorite_teachers FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can add favorites" ON public.favorite_teachers FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can remove favorites" ON public.favorite_teachers FOR DELETE USING (auth.uid() = student_id);

CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can update message read status" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Students can create reviews for their sessions" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view their own documents" ON public.verification_documents FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can upload documents" ON public.verification_documents FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update their own documents" ON public.verification_documents FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can view all documents" ON public.verification_documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update documents" ON public.verification_documents FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view notifications" ON public.admin_notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update notifications" ON public.admin_notifications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete notifications" ON public.admin_notifications FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert notifications" ON public.admin_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view education levels" ON public.education_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can view education sub-categories" ON public.education_sub_categories FOR SELECT USING (true);

CREATE POLICY "Anyone can view active subjects" ON public.subjects FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active course materials" ON public.course_materials FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage course materials" ON public.course_materials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own complaints" ON public.complaints FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all complaints" ON public.complaints FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update complaints" ON public.complaints FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Session participants can view video sessions" ON public.video_sessions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = video_sessions.session_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())));
CREATE POLICY "Session participants can insert video sessions" ON public.video_sessions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())));
CREATE POLICY "Session participants can update video sessions" ON public.video_sessions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = video_sessions.session_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())));

CREATE POLICY "Session participants can view signaling" ON public.video_signaling FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.video_sessions vs JOIN public.sessions s ON s.id = vs.session_id WHERE vs.id = video_signaling.video_session_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())));
CREATE POLICY "Session participants can send signaling" ON public.video_signaling FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.video_sessions vs JOIN public.sessions s ON s.id = vs.session_id WHERE vs.id = video_session_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())));

CREATE POLICY "Anyone can create contact messages" ON public.contact_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view all contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all online statuses" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update their own online status" ON public.user_presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own online status" ON public.user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view typing indicators" ON public.typing_indicators FOR SELECT USING (receiver_id = auth.uid() OR sender_id = auth.uid());
CREATE POLICY "Users can insert typing indicators" ON public.typing_indicators FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their typing indicators" ON public.typing_indicators FOR DELETE USING (auth.uid() = sender_id);

CREATE POLICY "Teachers can view their own withdrawals" ON public.teacher_withdrawals FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert their own withdrawals" ON public.teacher_withdrawals FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update their own pending withdrawals" ON public.teacher_withdrawals FOR UPDATE USING (auth.uid() = teacher_id AND status = 'pending');
CREATE POLICY "Admins can view all withdrawals" ON public.teacher_withdrawals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update withdrawals" ON public.teacher_withdrawals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their own audit logs" ON public.audit_logs FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Prevent direct inserts to audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "Prevent all updates to audit_logs" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "Prevent all deletes from audit_logs" ON public.audit_logs FOR DELETE USING (false);

-- 11) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_signaling;

-- 12) Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Teachers can view their own documents" ON storage.objects FOR SELECT USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public can view verification documents" ON storage.objects FOR SELECT USING (bucket_id = 'verification-documents');
CREATE POLICY "Admins can view all verification documents" ON storage.objects FOR SELECT USING (bucket_id = 'verification-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view course materials" ON storage.objects FOR SELECT USING (bucket_id = 'course-materials');
CREATE POLICY "Admins can upload course materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update course materials" ON storage.objects FOR UPDATE USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete course materials" ON storage.objects FOR DELETE USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));

-- 13) Seed data
INSERT INTO public.system_settings (key, value) VALUES
  ('platform_fee_percentage', '10'),
  ('minimum_hourly_rate', '20'),
  ('maximum_hourly_rate', '500'),
  ('verification_required', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.education_levels (level_name, description, sort_order) VALUES
  ('Basic', 'Primary/Basic Education (JHS)', 1),
  ('JHS', 'Junior High School', 2),
  ('SHS', 'Senior High School', 3),
  ('College Of Healths', 'Health Colleges', 4),
  ('University', 'University Programs', 5),
  ('Cyber Secutity', 'Cybersecurity', 6),
  ('Graphic Design', 'Graphic Design', 7),
  ('Web Design', 'Web Design', 8)
ON CONFLICT (level_name) DO NOTHING;

INSERT INTO public.subjects (name, description, icon, topics, education_level) VALUES
  ('Mathematics', 'From basic arithmetic to advanced calculus', 'Calculator', ARRAY['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'], 'Basic'),
  ('Sciences', 'Explore physics, chemistry, and biology', 'FlaskConical', ARRAY['Physics', 'Chemistry', 'Biology', 'Integrated Science'], 'Basic'),
  ('English Language', 'Master reading, writing, and communication', 'BookOpen', ARRAY['Grammar', 'Literature', 'Creative Writing', 'Comprehension'], 'Basic'),
  ('Social Studies', 'History, geography, and social sciences', 'Globe2', ARRAY['History', 'Geography', 'Civics', 'Economics'], 'Basic'),
  ('Visual Arts', 'Develop artistic talents and creativity', 'Palette', ARRAY['Drawing', 'Painting', 'Sculpture', 'Art History'], 'Basic'),
  ('Music', 'Learn instruments, vocals, and music theory', 'Music2', ARRAY['Piano', 'Guitar', 'Vocals', 'Music Theory'], 'Basic'),
  ('ICT & Computing', 'Digital skills and programming', 'Code', ARRAY['Computer Basics', 'Programming', 'Web Development', 'Office Applications'], 'Basic'),
  ('French Language', 'French for communication and academics', 'Languages', ARRAY['Basic French', 'Grammar', 'Conversation', 'Written French'], 'Basic'),
  ('Additional Mathematics', 'Advanced mathematical concepts and problem-solving', 'Calculator', ARRAY['Advanced Algebra', 'Calculus', 'Statistics', 'Discrete Mathematics'], 'SHS'),
  ('Agricultural Science', 'Study of agricultural practices and principles', 'Sprout', ARRAY['Crop Science', 'Animal Husbandry', 'Soil Science', 'Agricultural Economics'], 'SHS'),
  ('Ghanaian Language', 'Ghanaian languages and literature', 'Book', ARRAY['Twi', 'Ga', 'Ewe', 'Fante'], 'Basic'),
  ('Literature-in-English', 'English literature and literary analysis', 'ScrollText', ARRAY['Poetry', 'Novels', 'Drama', 'Literary Criticism'], 'SHS'),
  ('Religious and Moral Education', 'Religious and moral development', 'Heart', ARRAY['Ethics', 'Moral Philosophy', 'Religious Studies', 'Character Development'], 'Basic')
ON CONFLICT (name) DO NOTHING;
