import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  Star,
  MapPin,
  BadgeCheck,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface FavoriteTeacher {
  id: string;
  teacher_id: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    region: string | null;
  };
  teacherProfile?: {
    subjects: string[];
    hourly_rate: number;
    rating: number;
    is_verified: boolean;
  };
}

export function FavoriteTeachers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      subscribeFavorites();
    }
  }, [user]);

  const subscribeFavorites = () => {
    const channel = supabase
      .channel(`favorites-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorite_teachers",
          filter: `student_id=eq.${user?.id}`,
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData } = await supabase
        .from("favorite_teachers")
        .select("id, teacher_id")
        .eq("student_id", user?.id);

      if (favoritesData) {
        const favoritesWithDetails = await Promise.all(
          favoritesData.map(async (fav) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, region")
              .eq("user_id", fav.teacher_id)
              .maybeSingle();

            const { data: teacherProfile } = await supabase
              .from("teacher_profiles")
              .select("subjects, hourly_rate, rating, is_verified")
              .eq("user_id", fav.teacher_id)
              .maybeSingle();

            return {
              ...fav,
              profile: profile || undefined,
              teacherProfile: teacherProfile || undefined
            };
          })
        );
        setFavorites(favoritesWithDetails);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("favorite_teachers")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast({
        title: "Removed from favorites",
        description: "Teacher has been removed from your favorites."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Favorite Teachers
        </h1>
        <p className="text-muted-foreground mt-1">
          Your saved teachers for quick access
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No favorite teachers yet</p>
              <Link to="/teachers">
                <Button className="mt-4" variant="outline">
                  Browse Teachers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite, index) => (
            <motion.div
              key={favorite.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={favorite.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {favorite.profile?.full_name?.charAt(0) || "T"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {favorite.profile?.full_name || "Teacher"}
                        </h3>
                        {favorite.teacherProfile?.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span>{favorite.teacherProfile?.rating?.toFixed(1) || "N/A"}</span>
                        {favorite.profile?.region && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{favorite.profile.region}</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {favorite.teacherProfile?.subjects?.slice(0, 2).map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className="font-semibold text-primary">
                          GH₵{favorite.teacherProfile?.hourly_rate || 0}/hr
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFavorite(favorite.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Link to={`/teacher/${favorite.teacher_id}`}>
                            <Button size="sm">View Profile</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
