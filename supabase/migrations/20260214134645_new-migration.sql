-- Create contact_messages table for user inquiries
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
  admin_notes TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_messages
CREATE POLICY "Anyone can create contact messages"
  ON public.contact_messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add new subjects to the subjects table
INSERT INTO public.subjects (name, description, icon, topics) VALUES
  ('Additional Mathematics', 'Advanced mathematical concepts and problem-solving', 'Calculator', ARRAY['Advanced Algebra', 'Calculus', 'Statistics', 'Discrete Mathematics']),
  ('Agricultural Science', 'Study of agricultural practices and principles', 'Sprout', ARRAY['Crop Science', 'Animal Husbandry', 'Soil Science', 'Agricultural Economics']),
  ('Agriculture', 'Practical agricultural skills and knowledge', 'Leaf', ARRAY['Farming Techniques', 'Crop Production', 'Livestock Management', 'Sustainable Agriculture']),
  ('Applied Technology', 'Practical application of technology', 'Wrench', ARRAY['Technical Drawing', 'Workshop Practice', 'Electronics', 'Mechanics']),
  ('Arabic', 'Arabic language and literature', 'Languages', ARRAY['Modern Standard Arabic', 'Classical Arabic', 'Arabic Literature', 'Calligraphy']),
  ('Art and Design Foundation', 'Foundation in visual arts and design', 'Palette', ARRAY['Basic Drawing', 'Color Theory', 'Design Principles', 'Art History']),
  ('Arts and Design Studio', 'Advanced studio practice in arts and design', 'Brush', ARRAY['Advanced Drawing', 'Digital Art', 'Sculpture', 'Portfolio Development']),
  ('Aviation and Aerospace Engineering', 'Study of aircraft and spacecraft design', 'Plane', ARRAY['Aerodynamics', 'Aircraft Systems', 'Space Technology', 'Flight Mechanics']),
  ('Biomedical Science', 'Study of biological systems in medicine', 'Microscope', ARRAY['Human Biology', 'Medical Technology', 'Biochemistry', 'Pathology']),
  ('Business Management', 'Principles of business and management', 'Briefcase', ARRAY['Business Strategy', 'Operations Management', 'Marketing', 'Finance']),
  ('Clothing and Textiles', 'Fashion design and textile technology', 'Scissors', ARRAY['Fashion Design', 'Textile Science', 'Sewing Techniques', 'Pattern Making']),
  ('Computing', 'Computer science and programming fundamentals', 'Monitor', ARRAY['Programming', 'Algorithms', 'Data Structures', 'Software Development']),
  ('Design and Communication Technology', 'Design technology and communication', 'PenTool', ARRAY['Graphic Design', 'CAD', 'Technical Communication', 'Product Design']),
  ('Elective Physical Education and Health (PEH)', 'Physical education and health education', 'Activity', ARRAY['Sports', 'Fitness', 'Health Education', 'Physical Training']),
  ('Engineering', 'Principles of engineering and design', 'Cog', ARRAY['Engineering Design', 'Materials Science', 'Systems Engineering', 'Project Management']),
  ('Food and Nutrition', 'Food science and nutritional principles', 'Utensils', ARRAY['Food Science', 'Nutrition', 'Meal Planning', 'Food Safety']),
  ('General Science', 'Integrated science education', 'Atom', ARRAY['Physics', 'Chemistry', 'Biology', 'Environmental Science']),
  ('Ghanaian Language', 'Ghanaian languages and literature', 'Book', ARRAY['Twi', 'Ga', 'Ewe', 'Fante']),
  ('Government', 'Political science and governance', 'Building2', ARRAY['Political Systems', 'Constitution', 'Public Administration', 'International Relations']),
  ('Information Communication Technology (ICT)', 'Digital communication and technology', 'Wifi', ARRAY['Computer Networks', 'Digital Communication', 'Cybersecurity', 'IT Management']),
  ('Intervention English', 'English language support for struggling students', 'BookOpen', ARRAY['Basic English', 'Reading Support', 'Writing Skills', 'Language Development']),
  ('Intervention Mathematics', 'Mathematics support for struggling students', 'Calculator', ARRAY['Basic Math', 'Problem Solving', 'Mathematical Reasoning', 'Numeracy Skills']),
  ('Literature-in-English', 'English literature and literary analysis', 'ScrollText', ARRAY['Poetry', 'Novels', 'Drama', 'Literary Criticism']),
  ('Management in Living', 'Home economics and life skills', 'Home', ARRAY['Home Management', 'Family Life', 'Consumer Education', 'Life Skills']),
  ('Manufacturing Engineering', 'Manufacturing processes and systems', 'Factory', ARRAY['Production Systems', 'Quality Control', 'Manufacturing Technology', 'Industrial Engineering']),
  ('Performing Arts', 'Theatre, dance, and performance skills', 'Theater', ARRAY['Drama', 'Dance', 'Public Speaking', 'Stage Performance']),
  ('Religious Studies (Christian)', 'Christian religious education', 'Cross', ARRAY['Bible Studies', 'Christian Ethics', 'Church History', 'Christian Theology']),
  ('Religious Studies (Islamic)', 'Islamic religious education', 'Moon', ARRAY['Quran Studies', 'Islamic Ethics', 'Islamic History', 'Islamic Theology']),
  ('Religious and Moral Education', 'Religious and moral development', 'Heart', ARRAY['Ethics', 'Moral Philosophy', 'Religious Studies', 'Character Development']),
  ('Robotics', 'Robotics and automation technology', 'Bot', ARRAY['Robot Design', 'Programming', 'Automation', 'Control Systems']),
  ('Social Studies', 'Social sciences and humanities', 'Users', ARRAY['Sociology', 'Anthropology', 'Psychology', 'Social Issues']),
  ('Spanish', 'Spanish language and culture', 'Languages', ARRAY['Spanish Grammar', 'Conversation', 'Spanish Literature', 'Hispanic Culture'])
ON CONFLICT (name) DO NOTHING;