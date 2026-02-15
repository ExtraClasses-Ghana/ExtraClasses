import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Star,
  BookOpen,
  TrendingUp,
  Users,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Session {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  teacher_id: string;
  amount: number;
}

interface TeacherInfo {
  full_name: string;
  avatar_url: string | null;
}

export function StudentOverview() {
  const { user, profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<(Session & { teacher?: TeacherInfo })[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingCount: 0,
    totalSpent: 0,
    favoriteTeachers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch upcoming sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", user?.id)
        .gte("session_date", today)
        .in("status", ["pending", "confirmed"])
        .order("session_date", { ascending: true })
        .limit(5);

      if (sessions) {
        // Fetch teacher info for each session
        const sessionsWithTeachers = await Promise.all(
          sessions.map(async (session) => {
            const { data: teacherProfile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", session.teacher_id)
              .maybeSingle();
            return { ...session, teacher: teacherProfile || undefined };
          })
        );
        setUpcomingSessions(sessionsWithTeachers);
      }

      // Fetch stats
      const { count: totalSessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id);

      const { count: upcomingCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id)
        .gte("session_date", today)
        .in("status", ["pending", "confirmed"]);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("payer_id", user?.id)
        .eq("status", "completed");

      const totalSpent = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const { count: favoriteTeachers } = await supabase
        .from("favorite_teachers")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id);

      setStats({
        totalSessions: totalSessions || 0,
        upcomingCount: upcomingCount || 0,
        totalSpent,
        favoriteTeachers: favoriteTeachers || 0
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-accent text-accent-foreground";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your learning journey
          </p>
        </div>
        <Button className="btn-coral" onClick={() => window.location.href = '/teachers'}>
          <BookOpen className="w-4 h-4 mr-2" />
          Find a Teacher
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcomingCount}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary/10">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.favoriteTeachers}</p>
                  <p className="text-sm text-muted-foreground">Favorite Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <span className="text-xl">GH₵</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSpent.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Upcoming Sessions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard/student/history'}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No upcoming sessions</p>
              <Button className="mt-4" variant="outline" onClick={() => window.location.href = '/teachers'}>
                Book a Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={session.teacher?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {session.teacher?.full_name?.charAt(0) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {session.teacher?.full_name || "Teacher"}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {session.subject}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(session.session_date), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.start_time.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        {session.session_type === "online" ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {session.session_type}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
