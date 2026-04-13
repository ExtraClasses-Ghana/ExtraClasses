import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Clock, ChevronRight, BadgeCheck, Video, Home, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
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
  subjects: string[] | null;
  hourly_rate: number | null;
  experience_years: number | null;
  is_verified: boolean | null;
  rating: number | null;
  total_reviews: number | null;
  teaching_mode: string | null;
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
  const [currentSlide, setCurrentSlide] = useState(0);

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
        .limit(10);

      if (error) throw error;

      // Fetch profiles for each teacher
      if (teacherProfiles && teacherProfiles.length > 0) {
        const userIds = teacherProfiles.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, region, status")
          .in("user_id", userIds);

        const teachersWithProfiles = teacherProfiles
          .map(teacher => ({
            ...teacher,
            profile: profiles?.find(p => p.user_id === teacher.user_id) || null
          }))
          .filter(t => {
            const p = t.profile as { status?: string } | null;
            return p && p.status !== "blocked" && p.status !== "suspended";
          });

        setTeachers(teachersWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = selectedRegion === "All Regions" 
    ? teachers.slice(0, 10)
    : teachers.filter(t => t.profile?.region === selectedRegion).slice(0, 10);

  // Carousel functions
  const itemsPerSlide = 1;
  const totalSlides = Math.ceil(filteredTeachers.length / itemsPerSlide);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

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

        {/* Teachers Display - Carousel on Mobile, Grid on Desktop */}
        {!loading && filteredTeachers.length > 0 && (
          <>
            {/* Mobile Carousel */}
            <div className="block md:hidden relative">
              <div className="overflow-hidden">
                <AnimatePresence>
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4"
                  >
                    {filteredTeachers
                      .slice(currentSlide * itemsPerSlide, (currentSlide * itemsPerSlide) + itemsPerSlide)
                      .map((teacher, index) => (
                        <Link
                          to={`/teacher/${teacher.user_id}`}
                          key={teacher.id}
                          className="flex-1 min-w-0"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="teacher-card group cursor-pointer h-full"
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

                            {/* Teacher Info */}
                            <div className="space-y-3">
                              <div>
                                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                  {teacher.profile?.full_name || "Teacher"}
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {teacher.profile?.region || "Location not specified"}
                                </div>
                              </div>

                              {/* Rating */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">{teacher.rating?.toFixed(1) || "0.0"}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ({teacher.total_reviews || 0} reviews)
                                </span>
                              </div>

                              {/* Subjects */}
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects?.slice(0, 2).map((subject, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                                  >
                                    {subject}
                                  </span>
                                ))}
                                {teacher.subjects && teacher.subjects.length > 2 && (
                                  <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                                    +{teacher.subjects.length - 2}
                                  </span>
                                )}
                              </div>

                              {/* Teaching Mode & Price */}
                              <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                  {(teacher.teaching_mode === "online" || teacher.teaching_mode === "both") && (
                                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center" title="Online lessons">
                                      <Video className="w-3.5 h-3.5 text-blue-500" />
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
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Carousel Navigation */}
              {totalSlides > 1 && (
                <>
                  {/* Navigation Buttons */}
                  <button
                    onClick={prevSlide}
                    aria-label="Previous teachers"
                    title="Previous teachers"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextSlide}
                    aria-label="Next teachers"
                    title="Next teachers"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Dots Indicator */}
                  <div className="flex justify-center flex-wrap gap-2 mt-6 px-4">
                    {Array.from({ length: totalSlides }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        title={`Go to slide ${i + 1}`}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentSlide ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-gold text-gold" />
                          <span className="font-medium">{typeof teacher.rating === 'number' ? teacher.rating.toFixed(1) : (teacher.rating || "0.0")}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({teacher.total_reviews || 0} reviews)
                        </span>
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
                      {teacher.subjects && teacher.subjects.length > 2 && (
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
        </>
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
