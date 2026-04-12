import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Calculator, 
  FlaskConical, 
  BookOpen, 
  Globe2, 
  Palette, 
  Music2, 
  Code, 
  Languages,
  ArrowRight,
  Search,
  Loader2,
  Sprout,
  Leaf,
  Wrench,
  Microscope,
  Briefcase,
  Scissors,
  Monitor,
  PenTool,
  Activity,
  Cog,
  Utensils,
  Atom,
  Building2,
  Wifi,
  ScrollText,
  Home,
  Factory,
  Theater,
  Cross,
  Moon,
  Heart,
  Bot,
  Users,
  Plane,
  Brush
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEducationLevels } from "@/hooks/useEducationLevel";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topics: string[];
  teacher_count: number;
  education_level?: string | null;
}

const iconMap: Record<string, any> = {
  Calculator,
  FlaskConical,
  BookOpen,
  Globe2,
  Palette,
  Music2,
  Code,
  Languages,
  Sprout,
  Leaf,
  Wrench,
  Microscope,
  Briefcase,
  Scissors,
  Monitor,
  PenTool,
  Activity,
  Cog,
  Utensils,
  Atom,
  Building2,
  Wifi,
  ScrollText,
  Home,
  Factory,
  Theater,
  Cross,
  Moon,
  Heart,
  Bot,
  Users,
  Plane,
  Brush,
};

const colorMap: Record<string, string> = {
  Mathematics: "bg-blue-500/10 text-blue-600",
  Sciences: "bg-green-500/10 text-green-600",
  "English Language": "bg-purple-500/10 text-purple-600",
  "Social Studies": "bg-orange-500/10 text-orange-600",
  "Visual Arts": "bg-pink-500/10 text-pink-600",
  Music: "bg-indigo-500/10 text-indigo-600",
  "ICT & Computing": "bg-cyan-500/10 text-cyan-600",
  "French Language": "bg-red-500/10 text-red-600",
  // New subject colors
  "Additional Mathematics": "bg-blue-600/10 text-blue-700",
  "Agricultural Science": "bg-green-600/10 text-green-700",
  "Agriculture": "bg-green-700/10 text-green-800",
  "Applied Technology": "bg-gray-500/10 text-gray-600",
  "Arabic": "bg-yellow-500/10 text-yellow-600",
  "Art and Design Foundation": "bg-pink-600/10 text-pink-700",
  "Arts and Design Studio": "bg-pink-700/10 text-pink-800",
  "Aviation and Aerospace Engineering": "bg-sky-500/10 text-sky-600",
  "Biomedical Science": "bg-red-600/10 text-red-700",
  "Business Management": "bg-emerald-500/10 text-emerald-600",
  "Clothing and Textiles": "bg-rose-500/10 text-rose-600",
  "Computing": "bg-cyan-600/10 text-cyan-700",
  "Design and Communication Technology": "bg-violet-500/10 text-violet-600",
  "Elective Physical Education and Health (PEH)": "bg-orange-600/10 text-orange-700",
  "Engineering": "bg-slate-500/10 text-slate-600",
  "Food and Nutrition": "bg-amber-500/10 text-amber-600",
  "General Science": "bg-green-500/10 text-green-600",
  "Ghanaian Language": "bg-teal-500/10 text-teal-600",
  "Government": "bg-stone-500/10 text-stone-600",
  "Information Communication Technology (ICT)": "bg-cyan-500/10 text-cyan-600",
  "Intervention English": "bg-purple-600/10 text-purple-700",
  "Intervention Mathematics": "bg-blue-700/10 text-blue-800",
  "Literature-in-English": "bg-purple-700/10 text-purple-800",
  "Management in Living": "bg-lime-500/10 text-lime-600",
  "Manufacturing Engineering": "bg-zinc-500/10 text-zinc-600",
  "Performing Arts": "bg-fuchsia-500/10 text-fuchsia-600",
  "Religious Studies (Christian)": "bg-blue-800/10 text-blue-900",
  "Religious Studies (Islamic)": "bg-green-800/10 text-green-900",
  "Religious and Moral Education": "bg-indigo-500/10 text-indigo-600",
  "Spanish": "bg-red-500/10 text-red-600"
};

export default function Subjects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>("All Levels");
  const { levels: educationLevels, loading: loadingLevels } = useEducationLevels();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Fetch verified teachers to count teachers per subject
      const { data: teacherProfiles, error: teacherError } = await supabase
        .from("teacher_profiles")
        .select("subjects, verification_status, is_verified")
        .or("verification_status.eq.verified,is_verified.eq.true");

      if (teacherError) {
        console.error("Error fetching teachers:", teacherError);
      }

      // Count teachers per subject
      const subjectTeacherCount: Record<string, number> = {};
      (teacherProfiles || []).forEach((tp: any) => {
        const subjects = tp.subjects || [];
        subjects.forEach((subject: string) => {
          subjectTeacherCount[subject] = (subjectTeacherCount[subject] || 0) + 1;
        });
      });

      // Update teacher_count for each subject
      const enrichedSubjects = (data || []).map((subject: any) => ({
        ...subject,
        teacher_count: subjectTeacherCount[subject.name] || 0,
      }));

      setSubjects(enrichedSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    // Search filter
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.topics?.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Education level filter
    const matchesEducationLevel = selectedEducationLevel === "All Levels" || 
      subject.education_level === selectedEducationLevel;
    
    return matchesSearch && matchesEducationLevel;
  });

  const getIcon = (iconName: string | null) => {
    if (!iconName) return BookOpen;
    return iconMap[iconName] || BookOpen;
  };

  const getColor = (name: string) => {
    return colorMap[name] || "bg-gray-500/10 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-primary via-primary/90 to-accent/80 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Explore Subjects
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Find expert tutors across a wide range of academic subjects
              </p>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search subjects or topics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white/95 border-0 text-foreground"
                  />
                </div>
                
                {/* Education Level Filter */}
                <div className="sm:w-48">
                  <Select
                    value={selectedEducationLevel}
                    onValueChange={setSelectedEducationLevel}
                  >
                    <SelectTrigger className="h-12 bg-white/95 border-0 text-foreground">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border z-50">
                      <SelectItem value="All Levels">All Levels</SelectItem>
                      {!loadingLevels && educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSubjects.map((subject, index) => {
                  const IconComponent = getIcon(subject.icon);
                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.6), duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                        <CardContent className="pt-6">
                          <div className={`w-14 h-14 rounded-xl ${getColor(subject.name)} flex items-center justify-center mb-4`}>
                            <IconComponent className="w-7 h-7" />
                          </div>
                          
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {subject.name}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            {subject.description || "Find expert tutors for this subject."}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {subject.topics?.slice(0, 3).map((topic) => (
                              <span
                                key={topic}
                                className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                              >
                                {topic}
                              </span>
                            ))}
                            {subject.topics?.length > 3 && (
                              <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                                +{subject.topics.length - 3} more
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                              {subject.teacher_count} {subject.teacher_count === 1 ? "Teacher" : "Teachers"}
                            </span>
                            <Link to={`/teachers?subject=${encodeURIComponent(subject.name)}`}>
                              <Button variant="ghost" size="sm" className="group-hover:text-primary">
                                Find Tutors
                                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!loading && filteredSubjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {subjects.length === 0 
                    ? "No subjects available yet. Check back soon!"
                    : `No subjects found matching "${searchTerm}"`
                  }
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
            <Card className="bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                    Can't find your subject?
                  </h2>
                  <p className="text-primary-foreground/80 mb-6">
                    We're constantly adding new subjects and teachers. Let us know what you're looking for!
                  </p>
                  <Link to="/contact">
                    <Button variant="secondary" size="lg">
                      Contact Us
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
