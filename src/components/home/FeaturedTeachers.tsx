import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, ChevronRight, BadgeCheck, Video, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const ghanaRegions = [
  "All Regions",
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Oti",
  "North East",
  "Savannah",
];

interface TeacherWithProfile {
  id: string;
  user_id: string;
  bio: string | null;
  subjects: string[];
  hourly_rate: number;
  experience_years: number;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  teaching_mode: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
    region: string | null;
  } | null;
}

export function FeaturedTeachers() {
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Subscribe to realtime updates so featured teachers refresh automatically
  useEffect(() => {
    const tpChannel = supabase
      .channel("featured_teacher_profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_profiles" },
        (payload) => {
          console.log("Realtime teacher_profiles change (featured):", payload);
          fetchTeachers();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("featured_profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          console.log("Realtime profiles change (featured):", payload);
          fetchTeachers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tpChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teacherProfiles, error } = await supabase
        .from("teacher_profiles")
        .select(`
          id,
          user_id,
          bio,
          subjects,
          hourly_rate,
          experience_years,
          is_verified,
          rating,
          total_reviews,
          teaching_mode
        `)
        // Accept either the textual verification status or the boolean flag
        .or("verification_status.eq.verified,is_verified.eq.true")
        .order("rating", { ascending: false })
        .limit(8);

      if (error) throw error;

      // Fetch profiles for each teacher
      if (teacherProfiles && teacherProfiles.length > 0) {
        const userIds = teacherProfiles.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, region")
          .in("user_id", userIds);

        const teachersWithProfiles = teacherProfiles.map(teacher => ({
          ...teacher,
          profile: profiles?.find(p => p.user_id === teacher.user_id) || null
        }));

        setTeachers(teachersWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = selectedRegion === "All Regions" 
    ? teachers.slice(0, 4)
    : teachers.filter(t => t.profile?.region === selectedRegion).slice(0, 4);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              Top Rated
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Featured <span className="text-secondary">Teachers</span>
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 self-start sm:self-auto">
            {/* Region Dropdown */}
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px] bg-white border-border">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent className="bg-white border-border z-50">
                {ghanaRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to="/teachers">
              <Button variant="outline" className="btn-outline">
                View All Teachers
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && teachers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground text-lg mb-4">
              No verified teachers available yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Teachers are being verified. Check back soon!
            </p>
          </motion.div>
        )}

        {/* Teachers Grid */}
        {!loading && filteredTeachers.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTeachers.map((teacher, index) => (
              <Link to={`/teacher/${teacher.user_id}`} key={teacher.id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="teacher-card group cursor-pointer"
                >
                  {/* Image & Badge */}
                  <div className="relative mb-4">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                      {teacher.profile?.avatar_url ? (
                        <img
                          src={teacher.profile.avatar_url}
                          alt={teacher.profile.full_name}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <span className="text-4xl font-bold text-primary">
                            {teacher.profile?.full_name?.charAt(0) || "T"}
                          </span>
                        </div>
                      )}
                    </div>
                    {teacher.is_verified && (
                      <div className="absolute top-3 right-3 bg-accent text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-md">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    {/* Name & Rating */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {teacher.profile?.full_name || "Teacher"}
                      </h3>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-gold text-gold" />
                        <span className="font-medium">{teacher.rating || 0}</span>
                      </div>
                    </div>

                    {/* Subject Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {teacher.subjects?.slice(0, 2).map((subj) => (
                        <span
                          key={subj}
                          className="subject-badge bg-primary/10 text-primary text-xs"
                        >
                          {subj}
                        </span>
                      ))}
                      {teacher.subjects?.length > 2 && (
                        <span className="subject-badge bg-muted text-muted-foreground text-xs">
                          +{teacher.subjects.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {teacher.profile?.region && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {teacher.profile.region}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {teacher.experience_years || 0} years
                      </div>
                    </div>

                    {/* Teaching Modes & Price */}
                    <div className="flex items-center justify-between pt-3 border-t border-border mb-4">
                      <div className="flex items-center gap-2">
                        {(teacher.teaching_mode === "online" || teacher.teaching_mode === "both") && (
                          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center" title="Online lessons">
                            <Video className="w-3.5 h-3.5 text-accent" />
                          </div>
                        )}
                        {(teacher.teaching_mode === "in_person" || teacher.teaching_mode === "both") && (
                          <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center" title="In-person lessons">
                            <Home className="w-3.5 h-3.5 text-gold" />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-secondary">
                          GH₵{teacher.hourly_rate || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">/hour</p>
                      </div>
                    </div>

                    {/* Book Session Button */}
                    <Button className="w-full btn-coral text-sm">
                      Book Session
                    </Button>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredTeachers.length === 0 && teachers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No teachers found in {selectedRegion}. Try another region.</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
