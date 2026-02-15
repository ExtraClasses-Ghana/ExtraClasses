import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, BadgeCheck, Video, Home, MessageCircle, Heart, Share2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ComplaintModal } from "./ComplaintModal";

interface TeacherHeaderProps {
  teacher: {
    id: number | string;
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
  };
  onBookSession: () => void;
  onMessage?: () => void;
}

export function TeacherHeader({ teacher, onBookSession, onMessage }: TeacherHeaderProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  // Check if already favorited
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("favorite_teachers")
        .select("id")
        .eq("student_id", user.id)
        .eq("teacher_id", String(teacher.id))
        .maybeSingle();
      setIsFavorite(!!data);
    };
    checkFavorite();
  }, [user, teacher.id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorite teachers",
        variant: "destructive",
      });
      return;
    }

    setLoadingFavorite(true);
    try {
      const teacherId = String(teacher.id);
      if (isFavorite) {
        await supabase
          .from("favorite_teachers")
          .delete()
          .eq("student_id", user.id)
          .eq("teacher_id", teacherId);
        setIsFavorite(false);
        toast({ title: "Removed from favorites" });
      } else {
        const { error } = await supabase.from("favorite_teachers").insert({
          student_id: user.id,
          teacher_id: teacherId,
        });
        if (error) throw error;
        setIsFavorite(true);
        toast({ title: "Added to favorites" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${teacher.name} - ${teacher.subject} Teacher on ExtraClasses Ghana`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  return (
    <>
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-accent/20 pt-24 pb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-secondary rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row gap-8 items-start"
          >
            {/* Profile Image */}
            <div className="relative flex-shrink-0">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-4 border-white/20 shadow-xl">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {teacher.verified && (
                <div className="absolute -bottom-2 -right-2 bg-accent text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-lg">
                  <BadgeCheck className="w-4 h-4" />
                  Verified
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-white">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-display font-bold">
                  {teacher.name}
                </h1>
              </div>

              <p className="text-xl text-white/80 mb-4">{teacher.subject} Specialist</p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-gold text-gold" />
                  <span className="font-semibold">{teacher.rating}</span>
                  <span className="text-white/70">({teacher.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <MapPin className="w-4 h-4" />
                  {teacher.location}
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <Clock className="w-4 h-4" />
                  {teacher.experience} experience
                </div>
              </div>

              {/* Teaching Modes */}
              <div className="flex flex-wrap gap-2 mb-4">
                {teacher.online && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
                    <Video className="w-4 h-4" />
                    Online Lessons
                  </span>
                )}
                {teacher.inPerson && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
                    <Home className="w-4 h-4" />
                    In-Person
                  </span>
                )}
              </div>

              {/* Subject Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {teacher.subjects.map((subj) => (
                  <span
                    key={subj}
                    className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium"
                  >
                    {subj}
                  </span>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-white/60">Total Students</span>
                  <p className="font-semibold text-lg">{teacher.totalStudents}+</p>
                </div>
                <div>
                  <span className="text-white/60">Response Time</span>
                  <p className="font-semibold text-lg">{teacher.responseTime}</p>
                </div>
                <div>
                  <span className="text-white/60">Rate</span>
                  <p className="font-semibold text-lg text-gold">GH₵{teacher.hourlyRate}/hr</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <Button onClick={onBookSession} className="btn-coral w-full lg:w-48">
                Book Session
              </Button>
              <Button 
                variant="outline" 
                className="w-full lg:w-48 border-white/30 text-white hover:bg-white/10 hover:text-white"
                onClick={onMessage}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`text-white hover:bg-white/10 ${isFavorite ? 'text-red-400' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={loadingFavorite}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/10"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                {user && role === "student" && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-red-500/20 hover:text-red-300"
                    onClick={() => setShowComplaintModal(true)}
                    title="Report Teacher"
                  >
                    <Flag className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Complaint Modal */}
      <ComplaintModal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        teacherId={String(teacher.id)}
        teacherName={teacher.name}
      />
    </>
  );
}
