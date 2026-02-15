-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  topics TEXT[] DEFAULT '{}',
  teacher_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_materials table
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'PDF', -- PDF, Video, Document
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  level TEXT, -- JHS, SHS, University
  file_url TEXT,
  thumbnail_url TEXT,
  is_free BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Subjects policies (public read, admin write)
CREATE POLICY "Anyone can view active subjects"
  ON public.subjects
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Course materials policies
CREATE POLICY "Anyone can view active course materials"
  ON public.course_materials
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage course materials"
  ON public.course_materials
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', true);

-- Storage policies for course materials
CREATE POLICY "Public can view course materials"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-materials');

CREATE POLICY "Admins can upload course materials"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course materials"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course materials"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));

-- Update triggers
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial subjects
INSERT INTO public.subjects (name, description, icon, topics) VALUES
  ('Mathematics', 'From basic arithmetic to advanced calculus', 'Calculator', ARRAY['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry']),
  ('Sciences', 'Explore physics, chemistry, and biology', 'FlaskConical', ARRAY['Physics', 'Chemistry', 'Biology', 'Integrated Science']),
  ('English Language', 'Master reading, writing, and communication', 'BookOpen', ARRAY['Grammar', 'Literature', 'Creative Writing', 'Comprehension']),
  ('Social Studies', 'History, geography, and social sciences', 'Globe2', ARRAY['History', 'Geography', 'Civics', 'Economics']),
  ('Visual Arts', 'Develop artistic talents and creativity', 'Palette', ARRAY['Drawing', 'Painting', 'Sculpture', 'Art History']),
  ('Music', 'Learn instruments, vocals, and music theory', 'Music2', ARRAY['Piano', 'Guitar', 'Vocals', 'Music Theory']),
  ('ICT & Computing', 'Digital skills and programming', 'Code', ARRAY['Computer Basics', 'Programming', 'Web Development', 'Office Applications']),
  ('French Language', 'French for communication and academics', 'Languages', ARRAY['Basic French', 'Grammar', 'Conversation', 'Written French']);