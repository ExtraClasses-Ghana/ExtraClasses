import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAdminDashboardStats } from "@/hooks/useAdminDashboardStats";
import {
  useStudentDemographics,
  useRevenueTrends,
  useSubjectDistribution,
} from "@/hooks/usePlatformAnalytics";
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
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useAdminDashboardStats();
  
  const { demographics, loading: demoLoading, error: demoError } = useStudentDemographics();
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [revenueDuration, setRevenueDuration] = useState(30);
  const { trends, loading: trendsLoading, error: trendsError } = useRevenueTrends(revenuePeriod, revenueDuration);
  const { distribution, loading: distLoading, error: distError } = useSubjectDistribution();
  
  const [recentTeachers, setRecentTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);

  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  ];

  const demographicsPieData = demographics
    .filter((d) => d.education_level)
    .map((d) => ({
      name: d.education_level || "Unknown",
      value: d.student_count,
      newToday: d.new_students_today,
      newWeek: d.new_students_week,
    }))
    .sort((a, b) => b.value - a.value);

  const subjectBarData = distribution
    .slice(0, 10)
    .map((d) => ({
      name: d.subject_name,
      value: d.teacher_count,
      revenue: d.total_revenue,
    }));

  const handleRevenuePeriodChange = (period: "daily" | "weekly" | "monthly") => {
    setRevenuePeriod(period);
    if (period === "daily") {
      setRevenueDuration(30);
    } else if (period === "weekly") {
      setRevenueDuration(12);
    } else {
      setRevenueDuration(12);
    }
  };

  useEffect(() => {
    fetchRecentTeachers();

    const teacherProfilesChannel = supabase
      .channel("dashboard_recent_teachers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_profiles",
        },
        () => {
          fetchRecentTeachers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teacherProfilesChannel);
    };
  }, []);

  const fetchRecentTeachers = async () => {
    try {
      const { data: recent } = await supabase
        .from("teacher_profiles")
        .select(`
          *,
          profiles:user_id(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentTeachers(recent || []);
    } catch (error) {
      console.error("Error fetching recent teachers:", error);
    } finally {
      setTeachersLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Teachers",
      value: dashboardStats?.total_teachers || 0,
      icon: GraduationCap,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      ringColor: "ring-blue-500/20",
    },
    {
      title: "Total Students",
      value: dashboardStats?.total_students || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      ringColor: "ring-primary/20",
    },
    {
      title: "New Students Today",
      value: dashboardStats?.new_students_today || 0,
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      ringColor: "ring-emerald-500/20",
    },
    {
      title: "Active Sessions",
      value: dashboardStats?.active_sessions || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      ringColor: "ring-purple-500/20",
    },
    {
      title: "Pending Verification",
      value: dashboardStats?.pending_verifications || 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      ringColor: "ring-amber-500/20",
    },
    {
      title: "Total Revenue",
      value: "GH₵" + (dashboardStats?.total_revenue || 0).toLocaleString(),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      ringColor: "ring-green-500/20",
    },
    {
      title: "Completed Classes",
      value: dashboardStats?.completed_sessions || 0,
      icon: CheckCircle,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
      ringColor: "ring-teal-500/20",
    },
  ];

  return (
    <AdminDashboardLayout title="" subtitle="">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6 overflow-hidden">
        {/* Dynamic Glassmorphism Background */}
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        
        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Dashboard Overview
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Monitor your platform's performance, revenue, and overall activity.
              </motion.p>
            </div>
          </div>

          {statsError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-medium backdrop-blur-sm">
              <AlertCircle className="inline-block w-5 h-5 mr-2" />
              Error loading dashboard statistics: {statsError.message}
            </div>
          )}

          {/* Staggered Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm group hover:bg-white/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-bold mt-1 text-foreground">
                          {statsLoading ? "..." : stat.value}
                        </p>
                      </div>
                      <div className={"p-4 rounded-xl ring-1 transition-transform group-hover:scale-110 " + stat.bgColor + " " + stat.ringColor}>
                        <stat.icon className={"w-6 h-6 " + stat.color} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Student Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  {demoLoading ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">Loading charts...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={demographicsPieData.length > 0 ? demographicsPieData : [{name: "No Data", value: 1}]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          label={({ name, value }) => name + ": " + value}
                          isAnimationActive={true}
                        >
                          {(demographicsPieData.length > 0 ? demographicsPieData : [{name: "No Data", value: 1}]).map((entry, index) => (
                            <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Line Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader>
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <CardTitle className="text-lg font-bold">Revenue Trend</CardTitle>
                    <div className="flex bg-background/50 p-1 rounded-lg border border-border/50">
                      {(["daily", "weekly", "monthly"] as const).map(period => (
                        <button
                          key={period}
                          onClick={() => handleRevenuePeriodChange(period)}
                          className={"px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors " + (revenuePeriod === period ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">Loading charts...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trends.length > 0 ? trends : [{trend_label: "No Data", revenue: 0, session_count: 0}]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="trend_label" angle={-30} height={60} stroke="currentColor" tick={{ fontSize: 11, fill: 'currentColor' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue (GH₵)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="session_count" stroke="#3b82f6" strokeWidth={3} name="Sessions" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Subject Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="teachers" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-background/50 rounded-xl p-1 h-12">
                      <TabsTrigger value="teachers" className="rounded-lg text-sm transition-all data-[state=active]:shadow-sm">Teachers per Subject</TabsTrigger>
                      <TabsTrigger value="revenue" className="rounded-lg text-sm transition-all data-[state=active]:shadow-sm">Revenue by Subject</TabsTrigger>
                    </TabsList>

                    <TabsContent value="teachers" className="mt-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subjectBarData.length > 0 ? subjectBarData : [{name: "No Data", value: 0}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} angle={-30} height={80} stroke="currentColor" />
                          <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="value" fill="#8b5cf6" name="Teachers" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="revenue" className="mt-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subjectBarData.length > 0 ? subjectBarData : [{name: "No Data", revenue: 0}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} angle={-30} height={80} stroke="currentColor" />
                          <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="revenue" fill="#10b981" name="Revenue (GH₵)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex flex-col gap-1">
                    <span>Recent Teachers</span>
                    <span className="text-xs font-normal text-muted-foreground tracking-normal uppercase">Newest Registrations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teachersLoading ? (
                      <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>
                    ) : recentTeachers.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No teachers registered yet</p>
                    ) : (
                      recentTeachers.map((teacher, idx) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={teacher.user_id || idx}
                          className="flex items-center justify-between p-4 rounded-xl bg-background/60 hover:bg-white/50 border border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center ring-1 ring-secondary/30">
                              {teacher.profiles?.avatar_url ? (
                                <img src={teacher.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <GraduationCap className="w-5 h-5 text-secondary" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-sm truncate">{teacher.profiles?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {teacher.profiles?.email}
                              </p>
                            </div>
                          </div>
                          <div>
                            {teacher.verification_status === "verified" && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </div>
                            )}
                            {(teacher.verification_status === "in_review" || teacher.verification_status === "pending") && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Review</span>
                              </div>
                            )}
                            {(teacher.verification_status === "unverified" || !teacher.verification_status) && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-foreground/10 text-muted-foreground text-xs font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>New</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
