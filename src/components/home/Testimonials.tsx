import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_profile: {
    full_name: string;
    avatar_url: string | null;
    region: string | null;
  } | null;
}

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgRating: 0,
    totalReviews: 0,
    satisfactionRate: 0,
    regionsCount: 0
  });

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, student_id")
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (reviewsData && reviewsData.length > 0) {
        const studentIds = reviewsData.map(r => r.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, region")
          .in("user_id", studentIds);

        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          student_profile: profiles?.find(p => p.user_id === review.student_id) || null
        }));

        setReviews(reviewsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get average rating
      const { data: reviewStats } = await supabase
        .from("reviews")
        .select("rating");

      // Get regions count
      const { data: profiles } = await supabase
        .from("profiles")
        .select("region")
        .not("region", "is", null);

      if (reviewStats && reviewStats.length > 0) {
        const avg = reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewStats.length;
        const satisfiedCount = reviewStats.filter(r => r.rating >= 4).length;
        
        setStats({
          avgRating: Math.round(avg * 10) / 10,
          totalReviews: reviewStats.length,
          satisfactionRate: Math.round((satisfiedCount / reviewStats.length) * 100),
          regionsCount: new Set(profiles?.map(p => p.region)).size
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fallback testimonials if no reviews
  const fallbackTestimonials = [
    {
      id: "1",
      rating: 5,
      comment: "ExtraClasses Ghana has been a game-changer for my children's education. The teachers are professional, patient, and truly care about student success.",
      student_profile: {
        full_name: "Nana Adwoa",
        avatar_url: null,
        region: "Greater Accra"
      }
    },
    {
      id: "2",
      rating: 5,
      comment: "Finding a qualified physics tutor was so easy. The platform's verification system gave me confidence that I was learning from an expert.",
      student_profile: {
        full_name: "Kwesi Boateng",
        avatar_url: null,
        region: "Ashanti"
      }
    },
    {
      id: "3",
      rating: 5,
      comment: "The online tutoring feature is amazing! I can learn French from the comfort of my home. My teacher makes every lesson engaging and fun.",
      student_profile: {
        full_name: "Akosua Mensah",
        avatar_url: null,
        region: "Volta"
      }
    }
  ];

  const displayReviews = reviews.length > 0 ? reviews : fallbackTestimonials;

  return (
    <section id="testimonials" className="py-24 bg-primary relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-secondary text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4">
            What Our <span className="text-secondary">Community</span> Says
          </h2>
          <p className="text-lg text-white/70">
            Hear from students, parents, and teachers across Ghana who have 
            experienced the ExtraClasses Ghana difference.
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {/* Testimonials Grid */}
        {!loading && (
          <div className="grid md:grid-cols-3 gap-8">
            {displayReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {/* Quote Icon */}
                <Quote className="w-10 h-10 text-secondary/50 mb-6" />

                {/* Content */}
                <p className="text-white/90 mb-6 leading-relaxed">
                  "{review.comment}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {review.student_profile?.avatar_url ? (
                    <img
                      src={review.student_profile.avatar_url}
                      alt={review.student_profile.full_name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary/50"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center ring-2 ring-secondary/50">
                      <span className="text-lg font-bold text-secondary">
                        {review.student_profile?.full_name?.charAt(0) || "S"}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-white">
                      {review.student_profile?.full_name || "Student"}
                    </h4>
                    <p className="text-sm text-white/60">
                      {review.student_profile?.region || "Ghana"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
        >
          {[
            { value: stats.avgRating > 0 ? `${stats.avgRating}/5` : "4.9/5", label: "Average Rating" },
            { value: stats.totalReviews > 0 ? stats.totalReviews.toLocaleString() : "0", label: "Total Reviews" },
            { value: stats.satisfactionRate > 0 ? `${stats.satisfactionRate}%` : "95%", label: "Satisfaction Rate" },
            { value: stats.regionsCount > 0 ? `${stats.regionsCount}` : "16", label: "Regions Covered" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold text-secondary mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
