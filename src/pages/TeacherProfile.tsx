import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherAbout } from "@/components/teacher/TeacherAbout";
import { ReviewsSection } from "@/components/teacher/ReviewsSection";
import { BookingModal } from "@/components/teacher/BookingModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TeacherData {
  id: string;
  name: string;
  subject: string;
  subjects: string[];
  location: string;
  rating: number;
  reviews: number;
  hourlyRate: number;
  experience: string;
  image: string;
  verified: boolean;
  online: boolean;
  inPerson: boolean;
  bio: string;
  totalStudents: number;
  responseTime: string;
  qualifications: string[];
  languages: string[];
  achievements: string[];
}

export default function TeacherProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTeacher();
    }
  }, [id]);

  const fetchTeacher = async () => {
    try {
      // Fetch teacher profile
      const { data: teacherProfile, error: teacherError } = await supabase
        .from("teacher_profiles")
        .select("*")
        .eq("user_id", id)
        .single();

      if (teacherError) throw teacherError;

      // Check if teacher is verified and active
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .single();

      if (profileError) throw profileError;

      // Don't show rejected or blocked teachers
      if (profile.status === "blocked" || profile.status === "suspended") {
        navigate("/teachers");
        toast({
          title: "Teacher not available",
          description: "This teacher profile is not available.",
          variant: "destructive",
        });
        return;
      }

      // Don't show rejected teachers in public listing
      if (teacherProfile.verification_status === "rejected") {
        navigate("/teachers");
        toast({
          title: "Teacher not available",
          description: "This teacher profile is not available.",
          variant: "destructive",
        });
        return;
      }

      // Map to teacher data format
      const teachingMode = teacherProfile.teaching_mode || "both";
      const teacherData: TeacherData = {
        id: teacherProfile.user_id,
        name: profile.full_name || "Teacher",
        subject: teacherProfile.subjects?.[0] || "General",
        subjects: teacherProfile.subjects || [],
        location: profile.region || "Ghana",
        rating: Number(teacherProfile.rating) || 0,
        reviews: teacherProfile.total_reviews || 0,
        hourlyRate: Number(teacherProfile.hourly_rate) || 0,
        experience: `${teacherProfile.experience_years || 0} years`,
        image: profile.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
        verified: teacherProfile.is_verified || false,
        online: teachingMode === "online" || teachingMode === "both",
        inPerson: teachingMode === "in-person" || teachingMode === "both",
        bio: teacherProfile.bio || "No bio available.",
        totalStudents: teacherProfile.total_students || 0,
        responseTime: "< 2 hours",
        qualifications: teacherProfile.qualifications || [],
        languages: teacherProfile.languages || ["English"],
        achievements: (teacherProfile as any).achievements || [],
      };

      setTeacher(teacherData);
    } catch (error) {
      console.error("Error fetching teacher:", error);
      toast({
        title: "Error",
        description: "Failed to load teacher profile",
        variant: "destructive",
      });
      navigate("/teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (date: Date | undefined, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleBookSession = () => {
    setIsBookingOpen(true);
  };

  const handleMessage = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to message teachers",
        variant: "destructive",
      });
      return;
    }
    // Navigate to messages with this teacher selected
    if (role === "student") {
      navigate("/dashboard/student/messages", { state: { teacherId: id } });
    } else {
      toast({
        title: "Student account required",
        description: "Only students can message teachers",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading teacher profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Teacher not found</h2>
            <p className="text-muted-foreground">This teacher profile doesn't exist or is unavailable.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Teacher Header */}
      <TeacherHeader 
        teacher={{
          ...teacher,
          id: teacher.id,
        }} 
        onBookSession={handleBookSession} 
        onMessage={handleMessage}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <TeacherAbout teacher={teacher} />
          <ReviewsSection
            teacherId={id || ""}
            averageRating={teacher.rating}
            totalReviews={teacher.reviews}
          />
        </div>
      </div>

      <Footer />

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        teacher={{
          name: teacher.name,
          hourlyRate: teacher.hourlyRate,
          image: teacher.image,
          online: teacher.online,
          inPerson: teacher.inPerson,
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    </div>
  );
}
