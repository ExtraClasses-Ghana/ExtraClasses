import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, ThumbsUp, ChevronDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
  helpful: number;
  subject: string;
}

interface ReviewsSectionProps {
  teacherId: string;
  averageRating: number;
  totalReviews: number;
}

export function ReviewsSection({ teacherId, averageRating, totalReviews }: ReviewsSectionProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [visibleReviews, setVisibleReviews] = useState(3);
  const [loading, setLoading] = useState(true);
  const [ratingBreakdown, setRatingBreakdown] = useState([
    { stars: 5, percentage: 0, count: 0 },
    { stars: 4, percentage: 0, count: 0 },
    { stars: 3, percentage: 0, count: 0 },
    { stars: 2, percentage: 0, count: 0 },
    { stars: 1, percentage: 0, count: 0 },
  ]);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate rating breakdown from reviews
  const calculateRatingBreakdown = (reviewsList: Review[]) => {
    const breakdown = [
      { stars: 5, count: 0 },
      { stars: 4, count: 0 },
      { stars: 3, count: 0 },
      { stars: 2, count: 0 },
      { stars: 1, count: 0 },
    ];

    reviewsList.forEach((review) => {
      const index = 5 - review.rating;
      if (index >= 0 && index < breakdown.length) {
        breakdown[index].count++;
      }
    });

    const total = reviewsList.length;
    return breakdown.map((item) => ({
      stars: item.stars,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  };

  useEffect(() => {
    fetchReviews();
    subscribeToReviews();
  }, [teacherId]);

  // Recalculate rating breakdown whenever reviews change
  useEffect(() => {
    const breakdown = calculateRatingBreakdown(reviews);
    setRatingBreakdown(breakdown);
  }, [reviews]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, student_id")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch student profiles for each review
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", review.student_id)
            .maybeSingle();

          return {
            id: review.id,
            author: profile?.full_name || "Anonymous",
            avatar: profile?.avatar_url || "",
            rating: review.rating,
            date: getRelativeTime(new Date(review.created_at)),
            content: review.comment || "",
            helpful: 0,
            subject: "Session",
          };
        })
      );

      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToReviews = () => {
    const channel = supabase
      .channel(`reviews-${teacherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `teacher_id=eq.${teacherId}`,
        },
        async (payload) => {
          const newReview = payload.new as any;
          
          // Fetch the profile for the new review
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", newReview.student_id)
            .maybeSingle();

          const formattedReview: Review = {
            id: newReview.id,
            author: profile?.full_name || "Anonymous",
            avatar: profile?.avatar_url || "",
            rating: newReview.rating,
            date: "Just now",
            content: newReview.comment || "",
            helpful: 0,
            subject: "Session",
          };

          setReviews((prev) => [formattedReview, ...prev]);
          
          toast({
            title: "New review posted!",
            description: `${formattedReview.author} left a ${formattedReview.rating}-star review`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to leave a review",
        variant: "destructive",
      });
      return;
    }

    if (newRating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        teacher_id: teacherId,
        student_id: user.id,
        session_id: null,
        rating: newRating,
        comment: newComment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback",
      });

      setNewRating(0);
      setNewComment("");
      setShowReviewForm(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showMoreReviews = () => {
    setVisibleReviews((prev) => Math.min(prev + 3, reviews.length));
  };

  const canReview = user && role === "student";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">
          Reviews ({totalReviews + reviews.length})
        </h2>
        {canReview && !showReviewForm && (
          <Button onClick={() => setShowReviewForm(true)} variant="outline">
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 rounded-xl bg-muted/50 border border-border"
        >
          <h3 className="font-medium mb-3">Leave a Review</h3>
          
          {/* Star Rating */}
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                onClick={() => setNewRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || newRating)
                      ? "fill-gold text-gold"
                      : "fill-muted text-muted"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {newRating > 0 ? `${newRating} star${newRating > 1 ? "s" : ""}` : "Select rating"}
            </span>
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Share your experience with this teacher..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-4"
            rows={4}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewForm(false);
                setNewRating(0);
                setNewComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting || newRating === 0}
              className="btn-coral"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Rating Summary */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-6 border-b border-border">
        {/* Average Rating */}
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-foreground mb-1">{averageRating}</div>
          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(averageRating)
                    ? "fill-gold text-gold"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{totalReviews + reviews.length} reviews</p>
        </div>

        {/* Rating Breakdown */}
        <div className="flex-1 space-y-2">
          {ratingBreakdown.map(({ stars, percentage, count }) => (
            <div key={stars} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-12">{stars} star</span>
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground w-14 text-right">{percentage}% ({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.slice(0, visibleReviews).map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="pb-6 border-b border-border last:border-0"
            >
              <div className="flex items-start gap-4">
                <img
                  src={review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author)}&background=random`}
                  alt={review.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-foreground">{review.author}</h4>
                    <span className="text-xs text-muted-foreground">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-gold text-gold"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {review.subject}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    {review.content}
                  </p>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Helpful ({review.helpful})
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {visibleReviews < reviews.length && (
        <Button
          variant="outline"
          onClick={showMoreReviews}
          className="w-full mt-4"
        >
          Show More Reviews
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      )}
    </motion.div>
  );
}
