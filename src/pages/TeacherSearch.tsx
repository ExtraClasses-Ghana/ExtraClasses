import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Grid3X3, List, Map, X, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchFilters, FilterState } from "@/components/search/SearchFilters";
import { TeacherCard } from "@/components/search/TeacherCard";
import { TeacherMap } from "@/components/search/TeacherMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ghanaRegionCoordinates, Teacher } from "@/data/teachers";
import { cn } from "@/lib/utils";

const defaultFilters: FilterState = {
  subject: "All Subjects",
  location: "All Regions",
  priceRange: [0, 200],
  minRating: 0,
  online: false,
  inPerson: false,
  verified: false,
};

export default function TeacherSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showMap, setShowMap] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price-low" | "price-high" | "reviews">("rating");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Subscribe to realtime updates so that newly verified teachers appear immediately
  useEffect(() => {
    const tpChannel = supabase
      .channel('teacher_profiles_list_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_profiles' },
        (payload) => {
          console.log('Realtime teacher_profiles change:', payload);
          fetchTeachers();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles_list_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime profiles change:', payload);
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
      // Only show admin-approved (verified) teachers in listings
      const { data: teacherProfiles, error } = await supabase
        .from("teacher_profiles")
        .select("*")
        // Accept profiles where either the verification_status is 'verified'
        // or the boolean flag `is_verified` is true (handles different DB states)
        .or("verification_status.eq.verified,is_verified.eq.true");

      if (error) throw error;

      // For each teacher, fetch their profile
      const teachersWithProfiles = await Promise.all(
        (teacherProfiles || []).map(async (tp) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", tp.user_id)
            .single();

          // Skip blocked/suspended accounts
          if (profile?.status === "blocked" || profile?.status === "suspended") {
            return null;
          }

          const teachingMode = tp.teaching_mode || "both";
          const region = profile?.region || "Greater Accra";
          const coords = ghanaRegionCoordinates[region] || ghanaRegionCoordinates["Greater Accra"];

          const teacher: Teacher = {
            id: tp.user_id as any,
            name: profile?.full_name || "Teacher",
            subject: tp.subjects?.[0] || "General",
            subjects: tp.subjects || [],
            location: region,
            rating: Number(tp.rating) || 0,
            reviews: tp.total_reviews || 0,
            hourlyRate: Number(tp.hourly_rate) || 0,
            experience: `${tp.experience_years || 0} years`,
            image: profile?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
            verified: tp.is_verified || false,
            online: teachingMode === "online" || teachingMode === "both",
            inPerson: teachingMode === "in-person" || teachingMode === "both",
            bio: tp.bio || "No bio available.",
            totalStudents: tp.total_students || 0,
            responseTime: "< 2 hours",
            coordinates: coords,
          };

          return teacher;
        })
      );

      // Filter out null values (blocked/suspended)
      setTeachers(teachersWithProfiles.filter(Boolean) as Teacher[]);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    let result = teachers;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          t.subjects.some((s) => s.toLowerCase().includes(query)) ||
          t.location.toLowerCase().includes(query)
      );
    }

    // Subject filter
    if (filters.subject && filters.subject !== "All Subjects") {
      result = result.filter(
        (t) =>
          t.subject === filters.subject ||
          t.subjects.includes(filters.subject)
      );
    }

    // Location filter
    if (filters.location && filters.location !== "All Regions") {
      result = result.filter((t) => t.location === filters.location);
    }

    // Price range filter
    result = result.filter(
      (t) =>
        t.hourlyRate >= filters.priceRange[0] &&
        t.hourlyRate <= filters.priceRange[1]
    );

    // Rating filter
    if (filters.minRating > 0) {
      result = result.filter((t) => t.rating >= filters.minRating);
    }

    // Teaching mode filters
    if (filters.online) {
      result = result.filter((t) => t.online);
    }
    if (filters.inPerson) {
      result = result.filter((t) => t.inPerson);
    }

    // Verified filter
    if (filters.verified) {
      result = result.filter((t) => t.verified);
    }

    // Sort
    switch (sortBy) {
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "price-low":
        result = [...result].sort((a, b) => a.hourlyRate - b.hourlyRate);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.hourlyRate - a.hourlyRate);
        break;
      case "reviews":
        result = [...result].sort((a, b) => b.reviews - a.reviews);
        break;
    }

    return result;
  }, [searchQuery, filters, sortBy, teachers]);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchQuery("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.subject !== "All Subjects") count++;
    if (filters.location !== "All Regions") count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 200) count++;
    if (filters.minRating > 0) count++;
    if (filters.online) count++;
    if (filters.inPerson) count++;
    if (filters.verified) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-accent/20 pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4">
              Find Your Perfect <span className="text-gold">Teacher</span>
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Browse verified teachers across Ghana
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, subject, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg rounded-xl bg-white border-0 shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters - Desktop */}
            <div className="lg:w-72 flex-shrink-0">
              <SearchFilters
                filters={filters}
                onFilterChange={setFilters}
                onReset={resetFilters}
                resultCount={filteredTeachers.length}
              />
            </div>

            {/* Results Area */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{filteredTeachers.length}</strong> teachers found
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="text-sm text-secondary hover:underline"
                    >
                      Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                    aria-label="Sort teachers by"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="reviews">Most Reviews</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                    <button
                      onClick={() => setView("grid")}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        view === "grid"
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label="Grid view"
                      title="Grid view"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setView("list")}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        view === "list"
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label="List view"
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        showMap
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label="Toggle map view"
                      title="Toggle map view"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Map View */}
              {showMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "400px" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 rounded-2xl overflow-hidden"
                >
                  <TeacherMap
                    teachers={filteredTeachers}
                    selectedRegion={filters.location}
                  />
                </motion.div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading teachers...</p>
                  </div>
                </div>
              ) : filteredTeachers.length > 0 ? (
                <div
                  className={cn(
                    view === "grid"
                      ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
                      : "space-y-4"
                  )}
                >
                  {filteredTeachers.map((teacher, index) => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      view={view}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No teachers found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search query
                  </p>
                  <Button onClick={resetFilters} variant="outline">
                    Reset All Filters
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
