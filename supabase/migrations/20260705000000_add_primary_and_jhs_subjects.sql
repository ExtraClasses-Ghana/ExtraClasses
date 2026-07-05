-- Migration: Add Primary School (~Basic) and JHS Subjects
-- Timestamp: 2026-07-05 00:00:00

INSERT INTO public.subjects (name, description, icon, topics, education_level, is_active)
VALUES
  -- Primary School (Basic 1 to 6)
  ('English Language ~Basic', 'Primary English language learning focusing on reading, writing, spelling, and communication.', 'BookOpen', ARRAY['Grammar', 'Reading', 'Spelling', 'Vocabulary', 'Creative Writing'], 'Basic', true),
  ('Mathematics (Numeracy) ~Basic', 'Early mathematics and numeracy focusing on arithmetic, counting, fractions, and measurements.', 'Calculator', ARRAY['Arithmetic', 'Counting', 'Fractions', 'Basic Geometry', 'Measurements'], 'Basic', true),
  ('Science ~Basic', 'Introductory science exploring plants, animals, weather, and basic properties of matter.', 'FlaskConical', ARRAY['Plants', 'Animals', 'Human Body', 'Weather', 'Matter'], 'Basic', true),
  ('Our World and Our People (OWOP) ~Basic', 'Social studies for primary levels covering local history, national culture, and the environment.', 'Globe2', ARRAY['My Country', 'Culture', 'Social Rules', 'Environment', 'Civic Rights'], 'Basic', true),
  ('Religious and Moral Education (RME) ~Basic', 'Moral and religious foundation values, respect, and character development.', 'Heart', ARRAY['Moral Values', 'Religions', 'Commandments', 'Good Manners', 'Respect'], 'Basic', true),
  ('Ghanaian Language ~Basic', 'Primary level study of major Ghanaian languages and local customs.', 'Languages', ARRAY['Twi', 'Ga', 'Ewe', 'Fante', 'Traditional Customs'], 'Basic', true),
  ('Computing (ICT) ~Basic', 'Introduction to basic computer parts, mouse usage, keyboarding, and drawing tools.', 'Monitor', ARRAY['Computer Parts', 'Keyboard Skills', 'Using MS Paint', 'Word Processing', 'Safe Internet'], 'Basic', true),
  ('Creative Arts ~Basic', 'Developing primary students artistic talents in drawing, coloring, and performing arts.', 'Brush', ARRAY['Drawing', 'Coloring', 'Crafting', 'Performing Arts', 'Local Crafts'], 'Basic', true),
  ('History ~Basic', 'Introductory history covering Ghanaian ancestry, national heroes, and landmark sites.', 'Building2', ARRAY['Ghanaian History', 'National Heroes', 'Historic Sites', 'Independence', 'Founding Fathers'], 'Basic', true),
  ('Physical Education ~Basic', 'Physical activities, basic fitness, games, and body movement coordination.', 'Activity', ARRAY['Fitness', 'Games', 'Athletics', 'Gymnastics', 'Health & Safety'], 'Basic', true),
  ('French ~Basic', 'Basic French language introduction, greetings, numbers, and simple vocabulary.', 'Languages', ARRAY['Greetings', 'Vocabulary', 'Simple Dialogues', 'French Alphabets', 'Numbers'], 'Basic', true),

  -- Junior High School (JHS 1 to 3)
  ('English Language JHS', 'Comprehensive JHS English focusing on grammar, reading comprehension, literature, and essay writing.', 'BookOpen', ARRAY['Comprehension', 'Grammar', 'Literature', 'Essay Writing', 'Oral English'], 'JHS', true),
  ('Mathematics JHS', 'Standard JHS mathematics, covering algebra, geometry, statistics, and probability.', 'Calculator', ARRAY['Algebra', 'Geometry', 'Probability', 'Statistics', 'Sets'], 'JHS', true),
  ('Integrated Science JHS', 'Structured curriculum combining physics, chemistry, biology, and agricultural science.', 'Microscope', ARRAY['Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Atmosphere'], 'JHS', true),
  ('Social Studies JHS', 'JHS social studies addressing governance, civic responsibility, culture, and national development.', 'Globe2', ARRAY['Environment', 'Governance', 'National Development', 'Culture', 'Colonization'], 'JHS', true),
  ('Religious and Moral Education (RME) JHS', 'Critical study of Ghanaian religions, ethics, social values, and moral reasoning.', 'Heart', ARRAY['God & Creation', 'Religions in Ghana', 'Moral Behavior', 'Social Values', 'Ethical Issues'], 'JHS', true),
  ('Information and Communications Technology (ICT) JHS', 'Intermediate computing topics, spreadsheets, presentation software, and internet tools.', 'Code', ARRAY['Spreadsheets', 'Presentations', 'Programming Basics', 'Internet Tools', 'HTML'], 'JHS', true),
  ('Ghanaian Language and Culture JHS', 'In-depth study of local language structures, idioms, proverbs, and traditional rites.', 'Languages', ARRAY['Language Structure', 'Proverbs', 'Traditions', 'Festivals', 'Customary Rites'], 'JHS', true),
  ('Physical Education JHS', 'Structured physical training, competitive team sports, rules, and sportsmanship.', 'Activity', ARRAY['Physical Fitness', 'Team Sports', 'Rules of Games', 'Sportsmanship', 'First Aid'], 'JHS', true),
  ('French JHS', 'Conversational French, writing, comprehension, and grammar to prepare for BECE.', 'Languages', ARRAY['French Grammar', 'Conversation', 'Comprehension', 'Letter Writing', 'French Culture'], 'JHS', true),
  ('Basic Design and Technology (BDT) JHS', 'Design principles, technical drawing, pre-technical skills, and home economics options.', 'Wrench', ARRAY['Drawing & Design', 'Pre-Technical Skills', 'Home Economics', 'Graphic Design', 'Sewing & Catering'], 'JHS', true)

ON CONFLICT (name) 
DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  topics = EXCLUDED.topics,
  education_level = EXCLUDED.education_level,
  is_active = EXCLUDED.is_active,
  updated_at = now();
