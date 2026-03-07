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

export default function AdminDashboard() {
  // Fetch real-time dashboard statistics using optimized RPC function
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useAdminDashboardStats();
  
  // Fetch analytics data for insights charts
  const { demographics, loading: demoLoading, error: demoError } = useStudentDemographics();
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [revenueDuration, setRevenueDuration] = useState(30);
  const { trends, loading: trendsLoading, error: trendsError } = useRevenueTrends(revenuePeriod, revenueDuration);
  const { distribution, loading: distLoading, error: distError } = useSubjectDistribution();
  
  const [recentTeachers, setRecentTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);

  // Color palette for charts
  const COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#84cc16", // lime
  ];

  // Transform demographics for pie chart
  const demographicsPieData = demographics
    .filter((d) => d.education_level)
    .map((d) => ({
      name: d.education_level || "Unknown",
      value: d.student_count,
      newToday: d.new_students_today,
      newWeek: d.new_students_week,
    }))
    .sort((a, b) => b.value - a.value);

  // Transform subject distribution for bar chart
  const subjectBarData = distribution
    .slice(0, 10) // Top 10 subjects
    .map((d) => ({
      name: d.subject_name,
      value: d.teacher_count,
      revenue: d.total_revenue,
    }));

  const handleRevenuePeriodChange = (period: "daily" | "weekly" | "monthly") => {
    setRevenuePeriod(period);
    // Adjust duration based on period
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

    // Subscribe to teacher profile changes for recent teachers list
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
          console.log("Teacher profile changed, refreshing recent teachers");
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
      // Fetch recent teachers
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
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Students",
      value: dashboardStats?.total_students || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "New Students Today",
      value: dashboardStats?.new_students_today || 0,
      icon: UserPlus,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "New Students This Week",
      value: dashboardStats?.new_students_this_week || 0,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Verification",
      value: dashboardStats?.pending_verifications || 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Total Revenue",
      value: `GH₵${(dashboardStats?.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Sessions",
      value: dashboardStats?.active_sessions || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Completed Sessions",
      value: dashboardStats?.completed_sessions || 0,
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
      {/* Error State */}
      {statsError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error loading dashboard statistics</p>
          <p className="text-sm">{statsError.message}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">
                    {statsLoading ? "..." : stat.value}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Insights Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Student Demographics Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            {demoLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={demographicsPieData.length > 0 ? demographicsPieData : [{name: "No Data", value: 1}]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {(demographicsPieData.length > 0 ? demographicsPieData : [{name: "No Data", value: 1}]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} students`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => handleRevenuePeriodChange("daily")}
                  className={`px-2 py-1 text-xs rounded ${
                    revenuePeriod === "daily" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => handleRevenuePeriodChange("weekly")}
                  className={`px-2 py-1 text-xs rounded ${
                    revenuePeriod === "weekly" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => handleRevenuePeriodChange("monthly")}
                  className={`px-2 py-1 text-xs rounded ${
                    revenuePeriod === "monthly" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends.length > 0 ? trends : [{trend_label: "No Data", revenue: 0, session_count: 0, avg_session_value: 0}]} isAnimationActive={true}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="trend_label"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === "number") {
                        return value.toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        });
                      }
                      return value;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Revenue (GH₵)"
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="session_count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Sessions"
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    animationBegin={100}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Subject Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teachers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teachers" className="text-xs sm:text-sm">Teachers per Subject</TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue by Subject</TabsTrigger>
            </TabsList>

            {/* Teachers per Subject */}
            <TabsContent value="teachers" className="mt-4">
              {distLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subjectBarData.length > 0 ? subjectBarData : [{name: "No Data", value: 0, revenue: 0}]} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-30}
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      fill="#8b5cf6" 
                      name="Teachers"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            {/* Revenue by Subject */}
            <TabsContent value="revenue" className="mt-4">
              {distLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subjectBarData.length > 0 ? subjectBarData : [{name: "No Data", value: 0, revenue: 0}]} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-30}
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => {
                        if (typeof value === "number") {
                          return `GH₵${value.toLocaleString()}`;
                        }
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#10b981" 
                      name="Revenue (GH₵)"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      animationBegin={150}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Teachers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Teacher Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teachersLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : recentTeachers.length === 0 ? (
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
