import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  FileText, 
  Video, 
  Download, 
  BookOpen, 
  GraduationCap,
  Clock,
  Star,
  Lock,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface CourseMaterial {
  id: string;
  title: string;
  type: string;
  subject_id: string | null;
  level: string | null;
  downloads: number;
  rating: number;
  is_free: boolean;
  file_url: string | null;
}

interface Subject {
  id: string;
  name: string;
}

export default function CourseMaterials() {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    wassce: 0,
    bece: 0,
    videos: 0,
    notes: 0
  });

  useEffect(() => {
    fetchMaterials();
    fetchSubjects();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .eq("is_active", true)
        .order("downloads", { ascending: false });

      if (error) throw error;
      
      setMaterials(data || []);
      
      // Calculate stats
      const videos = data?.filter(m => m.type === "Video").length || 0;
      const pdfs = data?.filter(m => m.type === "PDF").length || 0;
      
      setStats({
        wassce: data?.filter(m => m.level === "SHS").length || 0,
        bece: data?.filter(m => m.level === "JHS").length || 0,
        videos,
        notes: pdfs
      });
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("is_active", true);

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return "General";
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "General";
  };

  const handleDownload = (material: CourseMaterial) => {
    if (material.file_url) {
      window.open(material.file_url, "_blank");
    }
  };

  const categories = [
    { name: "WASSCE Prep", count: stats.wassce, icon: GraduationCap },
    { name: "BECE Prep", count: stats.bece, icon: BookOpen },
    { name: "Video Lessons", count: stats.videos, icon: Video },
    { name: "Study Notes", count: stats.notes, icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-primary via-primary/90 to-accent/80 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Course Materials
              </h1>
              <p className="text-xl text-white/90">
                Access study materials, past questions, and video lessons to accelerate your learning
              </p>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-12 border-b">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <category.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.count} materials</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Materials Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Popular Materials
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Coming Soon!</h3>
                <p className="text-muted-foreground">
                  Course materials are being prepared. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material, index) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge 
                            variant="outline" 
                            className={material.type === "Video" 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {material.type === "Video" ? (
                              <Video className="w-3 h-3 mr-1" />
                            ) : (
                              <FileText className="w-3 h-3 mr-1" />
                            )}
                            {material.type}
                          </Badge>
                          {material.is_free ? (
                            <Badge className="bg-green-500">Free</Badge>
                          ) : (
                            <Badge variant="outline" className="border-secondary text-secondary">
                              <Lock className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mt-3">{material.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="secondary" className="text-xs">
                            {getSubjectName(material.subject_id)}
                          </Badge>
                          {material.level && (
                            <Badge variant="secondary" className="text-xs">
                              {material.level}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {material.downloads.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-gold text-gold" />
                            {material.rating || "New"}
                          </span>
                        </div>

                        <Button 
                          className="w-full" 
                          variant={material.is_free ? "default" : "outline"}
                          onClick={() => handleDownload(material)}
                          disabled={!material.file_url}
                        >
                          {material.is_free ? (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              {material.file_url ? "Download Free" : "Coming Soon"}
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Unlock Premium
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Coming Soon */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card className="bg-gradient-to-r from-primary to-accent text-white overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="max-w-2xl mx-auto text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-80" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                    More Materials Coming Soon!
                  </h2>
                  <p className="text-white/80 mb-6">
                    We're working with teachers to bring you more study materials, 
                    past questions, and video lessons for all subjects and levels.
                  </p>
                  <Button variant="secondary" size="lg">
                    Get Notified
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
