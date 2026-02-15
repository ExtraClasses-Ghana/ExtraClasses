import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus
} from "lucide-react";

interface DashboardStats {
  totalTeachers: number;
  totalStudents: number;
  pendingVerifications: number;
  totalRevenue: number;
  activeSessions: number;
  completedSessions: number;
  newStudentsToday: number;
  newStudentsThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTeachers: 0,
    totalStudents: 0,
    pendingVerifications: 0,
    totalRevenue: 0,
    activeSessions: 0,
    completedSessions: 0,
    newStudentsToday: 0,
    newStudentsThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTeachers, setRecentTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time changes for user roles (students and teachers)
    const userRolesChannel = supabase
      .channel('dashboard_user_roles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        (payload) => {
          console.log('User role change:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to real-time changes for teacher profiles (verifications)
    const teacherProfilesChannel = supabase
      .channel('dashboard_teacher_profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_profiles'
        },
        (payload) => {
          console.log('Teacher profile change:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to real-time changes for sessions (revenue and session stats)
    const sessionsChannel = supabase
      .channel('dashboard_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          console.log('Session change:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userRolesChannel);
      supabase.removeChannel(teacherProfilesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch teacher count
      const { count: teacherCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      // Fetch student count
      const { count: studentCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      // Fetch pending verifications
      const { count: pendingCount } = await supabase
        .from("teacher_profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending");

      // Fetch session stats
      const { data: sessions } = await supabase
        .from("sessions")
        .select("status, amount");

      const activeSessions = sessions?.filter(s => s.status === "confirmed").length || 0;
      const completedSessions = sessions?.filter(s => s.status === "completed").length || 0;
      const totalRevenue = sessions?.filter(s => s.status === "completed")
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      // Calculate new student registrations
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

      const { data: allStudentRoles } = await supabase
        .from("user_roles")
        .select("created_at")
        .eq("role", "student");

      const newStudentsToday = allStudentRoles?.filter(student => 
        new Date(student.created_at) >= startOfToday
      ).length || 0;

      const newStudentsThisWeek = allStudentRoles?.filter(student => 
        new Date(student.created_at) >= startOfWeek
      ).length || 0;

      // Fetch recent teachers
      const { data: recent } = await supabase
        .from("teacher_profiles")
        .select(`
          *,
          profiles:user_id(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalTeachers: teacherCount || 0,
        totalStudents: studentCount || 0,
        pendingVerifications: pendingCount || 0,
        totalRevenue,
        activeSessions,
        completedSessions,
        newStudentsToday,
        newStudentsThisWeek,
      });

      setRecentTeachers(recent || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Teachers",
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "New Students Today",
      value: stats.newStudentsToday,
      icon: UserPlus,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "New Students This Week",
      value: stats.newStudentsThisWeek,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Verification",
      value: stats.pendingVerifications,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Total Revenue",
      value: `GH₵${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Sessions",
      value: stats.activeSessions,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Completed Sessions",
      value: stats.completedSessions,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <AdminDashboardLayout
      title="Dashboard Overview"
      subtitle="Monitor your platform's performance"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Teachers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Teacher Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTeachers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No teachers registered yet</p>
            ) : (
              recentTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">{teacher.profiles?.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {teacher.verification_status === "verified" && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    )}
                    {teacher.verification_status === "pending" && (
                      <span className="flex items-center gap-1 text-sm text-amber-500">
                        <Clock className="w-4 h-4" /> Pending
                      </span>
                    )}
                    {(teacher.verification_status === "unverified" || !teacher.verification_status) && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" /> Unverified
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminDashboardLayout>
  );
}
