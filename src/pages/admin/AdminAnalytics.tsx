import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sessionsByMonth, setSessionsByMonth] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("created_at, amount, status, subject");

      if (sessions) {
        // Sessions by month
        const monthlyData: Record<string, number> = {};
        const revenueData: Record<string, number> = {};
        const subjectData: Record<string, number> = {};

        sessions.forEach((session) => {
          const date = new Date(session.created_at);
          const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });

          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;

          if (session.status === "completed") {
            revenueData[monthKey] = (revenueData[monthKey] || 0) + Number(session.amount);
          }

          if (session.subject) {
            subjectData[session.subject] = (subjectData[session.subject] || 0) + 1;
          }
        });

        setSessionsByMonth(
          Object.entries(monthlyData).map(([month, count]) => ({
            month,
            sessions: count,
          }))
        );

        setRevenueByMonth(
          Object.entries(revenueData).map(([month, revenue]) => ({
            month,
            revenue,
          }))
        );

        setSubjectDistribution(
          Object.entries(subjectData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([subject, count]) => ({
              name: subject,
              value: count,
            }))
        );
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <AdminDashboardLayout
      title="Analytics"
      subtitle="Platform performance insights"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sessions Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sessions Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsByMonth.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No session data available yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByMonth.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No revenue data available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--secondary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Popular Subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subjectDistribution.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No subject data available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subjectDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {subjectDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}
