import { useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import {
  useStudentDemographics,
  useRevenueTrends,
  useSubjectDistribution,
} from "@/hooks/usePlatformAnalytics";
import { TrendingUp, Users, BookOpen, Zap } from "lucide-react";

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

export default function AdminPlatformInsights() {
  const { demographics, loading: demoLoading, error: demoError } = useStudentDemographics();
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [revenueDuration, setRevenueDuration] = useState(30);
  const { trends, loading: trendsLoading, error: trendsError } = useRevenueTrends(revenuePeriod, revenueDuration);
  const { distribution, loading: distLoading, error: distError } = useSubjectDistribution();

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

  // Transform subject distribution for pie chart
  const subjectPieData = distribution
    .slice(0, 10) // Top 10 subjects
    .map((d) => ({
      name: d.subject_name,
      value: d.teacher_count,
      revenue: d.total_revenue,
    }));

  // Calculate total metrics
  const totalStudents = demographics.reduce((sum, d) => sum + d.student_count, 0);
  const totalTeachers = distribution.reduce((sum, d) => sum + d.teacher_count, 0);
  const totalRevenue = distribution.reduce((sum, d) => sum + d.total_revenue, 0);

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

  return (
    <AdminDashboardLayout
      title="Platform Performance Insights"
      subtitle="Comprehensive analytics and performance metrics"
    >
      {/* Error States */}
      {(demoError || trendsError || distError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error loading analytics</p>
          {demoError && <p className="text-sm">Demographics: {demoError.message}</p>}
          {trendsError && <p className="text-sm">Trends: {trendsError.message}</p>}
          {distError && <p className="text-sm">Distribution: {distError.message}</p>}
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold mt-1">{totalStudents}</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-3xl font-bold mt-1">{totalTeachers}</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">GH₵{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
                <p className="text-3xl font-bold mt-1">{distribution.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10">
                <BookOpen className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Student Demographics Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Student Demographics by Education Level</CardTitle>
          </CardHeader>
          <CardContent>
            {demoLoading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={demographicsPieData.length > 0 ? demographicsPieData : [{name: "No Data", value: 1}]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
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
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Trend</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={revenuePeriod === "daily" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRevenuePeriodChange("daily")}
                >
                  Daily
                </Button>
                <Button
                  variant={revenuePeriod === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRevenuePeriodChange("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant={revenuePeriod === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRevenuePeriodChange("monthly")}
                >
                  Monthly
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends.length > 0 ? trends : [{trend_label: "No Data", revenue: 0, session_count: 0, avg_session_value: 0}]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="trend_label"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    height={80}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === "number") {
                        return [
                          value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }),
                          "Value",
                        ];
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Revenue (GH₵)"
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="session_count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Sessions"
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    animationBegin={100}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
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
          <CardTitle>Subject Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teachers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="teachers">Teachers per Subject</TabsTrigger>
              <TabsTrigger value="revenue">Revenue by Subject</TabsTrigger>
              <TabsTrigger value="table">Detailed View</TabsTrigger>
            </TabsList>

            {/* Teachers per Subject Chart */}
            <TabsContent value="teachers">
              {distLoading ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectPieData.length > 0 ? subjectPieData : [{name: "No Data", value: 0, revenue: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      height={100}
                    />
                    <YAxis />
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

            {/* Revenue by Subject Chart */}
            <TabsContent value="revenue">
              {distLoading ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectPieData.length > 0 ? subjectPieData : [{name: "No Data", value: 0, revenue: 0}]}>
                    <Bar 
                      dataKey="revenue" 
                      fill="#10b981" 
                      name="Revenue (GH₵)"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      animationBegin={100}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            {/* Detailed Table View */}
            <TabsContent value="table">
              {distLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : distribution.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Subject</th>
                        <th className="text-right py-3 px-4">Teachers</th>
                        <th className="text-right py-3 px-4">Avg Rate (GH₵/hr)</th>
                        <th className="text-right py-3 px-4">Total Revenue (GH₵)</th>
                        <th className="text-right py-3 px-4">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distribution.map((subject, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{subject.subject_name}</td>
                          <td className="text-right py-3 px-4">{subject.teacher_count}</td>
                          <td className="text-right py-3 px-4">
                            {subject.avg_hourly_rate.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-4">
                            {subject.total_revenue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-4">{subject.completed_sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Student Growth Details */}
      <Card>
        <CardHeader>
          <CardTitle>Student Growth by Education Level</CardTitle>
        </CardHeader>
        <CardContent>
          {demoLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : demographics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Education Level</th>
                    <th className="text-right py-3 px-4">Total Students</th>
                    <th className="text-right py-3 px-4">New Today</th>
                    <th className="text-right py-3 px-4">New This Week</th>
                  </tr>
                </thead>
                <tbody>
                  {demographics.map((demo, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{demo.education_level || "Unknown"}</td>
                      <td className="text-right py-3 px-4">{demo.student_count}</td>
                      <td className="text-right py-3 px-4">
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {demo.new_students_today}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {demo.new_students_week}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </AdminDashboardLayout>
  );
}
