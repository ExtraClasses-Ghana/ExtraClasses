import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Users,
  TrendingUp,
  Star,
  DollarSign,
  ArrowUpRight,
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
  student_id: string;
  amount: number;
}

interface StudentInfo {
  full_name: string;
  avatar_url: string | null;
}

interface TeacherStats {
  totalEarnings: number;
  totalSessions: number;
  totalStudents: number;
  averageRating: number;
  upcomingCount: number;
  pendingCount: number;
}

export function TeacherOverview() {
  const { user, profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<(Session & { student?: StudentInfo })[]>([]);
  const [stats, setStats] = useState<TeacherStats>({
    totalEarnings: 0,
    totalSessions: 0,
    totalStudents: 0,
    averageRating: 0,
    upcomingCount: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Subscribe to realtime updates for this teacher's profile and teacher_profile
  useEffect(() => {
    if (!user) return;

    const tpChannel = supabase
      .channel(`teacher_dashboard_tp_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Realtime teacher_profiles update for teacher dashboard:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`teacher_dashboard_profile_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Realtime profiles update for teacher dashboard:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tpChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch upcoming sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("teacher_id", user?.id)
        .gte("session_date", today)
        .in("status", ["pending", "confirmed"])
        .order("session_date", { ascending: true })
        .limit(5);

      if (sessions) {
        const sessionsWithStudents = await Promise.all(
          sessions.map(async (session) => {
            const { data: studentProfile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", session.student_id)
              .maybeSingle();
            return { ...session, student: studentProfile || undefined };
          })
        );
        setUpcomingSessions(sessionsWithStudents);
      }

      // Fetch teacher profile stats
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("total_earnings, total_sessions, total_students, rating")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Fetch upcoming/pending counts
      const { count: upcomingCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", user?.id)
        .gte("session_date", today)
        .eq("status", "confirmed");

      const { count: pendingCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", user?.id)
        .eq("status", "pending");

      setStats({
        totalEarnings: Number(teacherProfile?.total_earnings) || 0,
        totalSessions: teacherProfile?.total_sessions || 0,
        totalStudents: teacherProfile?.total_students || 0,
        averageRating: Number(teacherProfile?.rating) || 0,
        upcomingCount: upcomingCount || 0,
        pendingCount: pendingCount || 0
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
            Here's your teaching dashboard overview
          </p>
        </div>
        {stats.pendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800">
            {stats.pendingCount} pending request{stats.pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    GH₵{stats.totalEarnings.toFixed(0)}
                  </p>
                  <p className="text-sm text-green-600/80">Total Earnings</p>
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
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
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
                <div className="p-3 rounded-xl bg-yellow-100">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Upcoming Sessions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard/teacher/sessions'}>
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
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={session.student?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {session.student?.full_name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {session.student?.full_name || "Student"}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {session.subject}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(session.session_date), "MMM d")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {session.start_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">GH₵{Number(session.amount).toFixed(0)}</p>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => window.location.href = '/dashboard/teacher/availability'}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Update Availability
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => window.location.href = '/dashboard/teacher/students'}
            >
              <Users className="w-4 h-4 mr-2" />
              View Students
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => window.location.href = '/dashboard/teacher/earnings'}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Earnings Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
