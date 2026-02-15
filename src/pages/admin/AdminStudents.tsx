import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Users,
  CheckCircle,
  Ban,
  AlertTriangle,
  RotateCcw,
  Trash2,
  TrendingUp,
  Calendar,
  UserPlus,
  RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface Student {
  user_id: string;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    region: string | null;
    status: string;
    status_reason: string | null;
  } | null;
  sessionCount: number;
  totalSpent: number;
}

export default function AdminStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [registrationData, setRegistrationData] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<Student[]>([]);
  
  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "suspend" | "block" | "restore" | "delete" | null;
    student: Student | null;
  }>({ open: false, type: null, student: null });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchRegistrationAnalytics();

    // Subscribe to real-time changes for student registrations
    const userRolesChannel = supabase
      .channel('student_registrations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: 'role=eq.student'
        },
        (payload) => {
          console.log('Student registration change:', payload);
          fetchStudents();
          fetchRegistrationAnalytics();
        }
      )
      .subscribe();

    // Subscribe to real-time changes for profile updates
    const profilesChannel = supabase
      .channel('student_profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Student profile change:', payload);
          fetchStudents(); // Refresh student data when profiles are updated
        }
      )
      .subscribe();

    // Subscribe to real-time changes for sessions (to update session counts and spending)
    const sessionsChannel = supabase
      .channel('student_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          console.log('Student session change:', payload);
          fetchStudents(); // Refresh student data when sessions are updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userRolesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, []);

  const validateStudentData = async () => {
    try {
      console.log("🔍 Validating student data completeness...");

      // Check if all user_roles with student role have corresponding profiles
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (studentRoles) {
        const userIds = studentRoles.map(s => s.user_id);

        // Check profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .in("user_id", userIds);

        const profilesCount = profiles?.length || 0;
        const missingProfiles = userIds.length - profilesCount;

        console.log(`📊 Student Data Validation:`);
        console.log(`   - Student roles: ${userIds.length}`);
        console.log(`   - Profiles found: ${profilesCount}`);
        console.log(`   - Missing profiles: ${missingProfiles}`);

        if (missingProfiles > 0) {
          console.warn(`⚠️  ${missingProfiles} students are missing profile data`);
        }
      }

      // Check for any orphaned sessions (sessions without corresponding student role)
      const { data: allSessions } = await supabase
        .from("sessions")
        .select("student_id");

      if (allSessions) {
        const uniqueStudentIds = [...new Set(allSessions.map(s => s.student_id))];
        const studentsWithSessions = uniqueStudentIds.length;

        const studentsWithRoles = studentRoles?.length || 0;
        const sessionsWithoutRoles = studentsWithSessions - studentsWithRoles;

        console.log(`   - Students with sessions: ${studentsWithSessions}`);
        console.log(`   - Sessions without student roles: ${sessionsWithoutRoles}`);

        if (sessionsWithoutRoles > 0) {
          console.warn(`⚠️  ${sessionsWithoutRoles} sessions belong to users without student roles`);
        }
      }

    } catch (error) {
      console.error("Error validating student data:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      // First validate data completeness
      await validateStudentData();

      // Fetch all student roles with comprehensive data
      const { data: studentRoles, error } = await supabase
        .from("user_roles")
        .select("user_id, created_at, role")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(`Found ${studentRoles?.length || 0} student roles`);

      const studentsWithData = await Promise.all(
        (studentRoles || []).map(async (student) => {
          // Fetch profile - use maybeSingle to handle cases where profile doesn't exist yet
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, email, phone, avatar_url, region, status, status_reason")
            .eq("user_id", student.user_id)
            .maybeSingle();

          if (profileError) {
            console.warn(`Profile fetch error for user ${student.user_id}:`, profileError);
          }

          // Fetch session stats - get all sessions for this student
          const { data: sessions, error: sessionsError } = await supabase
            .from("sessions")
            .select("amount, status")
            .eq("student_id", student.user_id);

          if (sessionsError) {
            console.warn(`Session fetch error for user ${student.user_id}:`, sessionsError);
          }

          const sessionCount = sessions?.length || 0;
          const totalSpent = sessions
            ?.filter(s => s.status === "completed")
            .reduce((sum, s) => sum + Number(s.amount || 0), 0) || 0;

          return {
            ...student,
            profile: profile || {
              full_name: "Profile Not Complete",
              email: "Not provided",
              phone: null,
              avatar_url: null,
              region: null,
              status: "pending",
              status_reason: "Profile setup incomplete"
            },
            sessionCount,
            totalSpent
          };
        })
      );

      console.log(`Processed ${studentsWithData.length} student records`);
      setStudents(studentsWithData);

      // Get recent registrations (last 10) - ensure we have valid data
      const validStudents = studentsWithData.filter(student => student && student.user_id);
      const recentStudents = validStudents
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      setRecentRegistrations(recentStudents);

      // Log summary for debugging
      const activeStudents = validStudents.filter(s => s.profile?.status === "active").length;
      const suspendedStudents = validStudents.filter(s => s.profile?.status === "suspended").length;
      const blockedStudents = validStudents.filter(s => s.profile?.status === "blocked").length;
      const pendingStudents = validStudents.filter(s => s.profile?.status === "pending" || !s.profile?.status).length;

      console.log(`Student Summary: Total: ${validStudents.length}, Active: ${activeStudents}, Suspended: ${suspendedStudents}, Blocked: ${blockedStudents}, Pending: ${pendingStudents}`);

    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load student data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationAnalytics = async () => {
    try {
      const { data: studentRoles, error } = await supabase
        .from("user_roles")
        .select("created_at")
        .eq("role", "student")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group registrations by month
      const monthlyData: Record<string, number> = {};
      
      studentRoles?.forEach((student) => {
        const date = new Date(student.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      const chartData = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        registrations: count,
      }));

      setRegistrationData(chartData);
    } catch (error) {
      console.error("Error fetching registration analytics:", error);
    }
  };

  // Polling fallback: refresh every 20s to ensure recent signups appear
  // (Useful if realtime events are not delivered for any reason)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling: refreshing student data and registration analytics');
      fetchStudents();
      fetchRegistrationAnalytics();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleAccountAction = async () => {
    if (!actionModal.student || !actionModal.type) return;

    setActionLoading(true);
    try {
      if (actionModal.type === "delete") {
        // Use the delete-account edge function with service role
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await supabase.functions.invoke("delete-account", {
          body: { target_user_id: actionModal.student.user_id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) throw response.error;

        toast({
          title: "Success",
          description: "Student account has been deleted",
        });
      } else {
        const newStatus = actionModal.type === "restore" ? "active" : actionModal.type === "suspend" ? "suspended" : "blocked";
        
        const { error } = await supabase
          .from("profiles")
          .update({
            status: newStatus,
            status_reason: actionModal.type === "restore" ? null : actionReason,
            status_updated_at: new Date().toISOString(),
            status_updated_by: user?.id,
          })
          .eq("user_id", actionModal.student.user_id);

        if (error) throw error;

        await supabase.from("admin_notifications").insert({
          type: `student_${actionModal.type}ed`,
          title: `Student Account ${actionModal.type === "restore" ? "Restored" : actionModal.type === "suspend" ? "Suspended" : "Blocked"}`,
          message: `${actionModal.student.profile?.full_name}'s account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}. Reason: ${actionReason || "N/A"}`,
          related_user_id: actionModal.student.user_id,
        });

        toast({
          title: "Success",
          description: `Student account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}`,
        });
      }

      setActionModal({ open: false, type: null, student: null });
      setActionReason("");
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update account status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAccountStatusBadge = (status: string | undefined) => {
    if (status === "suspended") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Suspended
        </Badge>
      );
    }
    if (status === "blocked") {
      return (
        <Badge variant="destructive">
          <Ban className="w-3 h-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <AdminDashboardLayout
      title="Student Session Report"
      subtitle="Monitor student registrations and manage student accounts"
    >
      {/* Registration Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Registration Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Student Registration Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="registrations" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No registration data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRegistrations.length > 0 ? (
              <div className="space-y-4">
                {recentRegistrations.slice(0, 5).map((student) => (
                  <div key={student.user_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentRegistrations.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{recentRegistrations.length - 5} more registrations
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent registrations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {/* Total Students Card */}
        <Card className="md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {students.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.profile?.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {students.filter(s => s.profile?.status === "suspended").length}
                </p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {students.filter(s => s.profile?.status === "blocked").length}
                </p>
                <p className="text-sm text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {students.filter(s => s.profile?.status === "pending" || !s.profile?.status).length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchStudents();
              fetchRegistrationAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Region</th>
                    <th className="text-left py-3 px-4 font-medium">Sessions</th>
                    <th className="text-left py-3 px-4 font-medium">Total Spent</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Joined</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.user_id} className="border-b border-border">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.profile?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.profile?.email}</p>
                            {student.profile?.phone && (
                              <p className="text-sm text-muted-foreground">{student.profile.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.profile?.region || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {student.sessionCount}
                      </td>
                      <td className="py-3 px-4">
                        GH₵{student.totalSpent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {getAccountStatusBadge(student.profile?.status)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.profile?.status === "blocked" || student.profile?.status === "suspended" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActionModal({ open: true, type: "restore", student })}
                              className="text-green-500 hover:text-green-600"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "suspend", student })}
                                className="text-amber-500 hover:text-amber-600"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "block", student })}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "delete", student })}
                                className="text-destructive hover:text-destructive/80"
                                title="Delete account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={actionModal.open} onOpenChange={(open) => !open && setActionModal({ open: false, type: null, student: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Delete Account" : "Block Account"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.type === "restore" 
                ? `Restore ${actionModal.student?.profile?.full_name}'s account to active status.`
                : actionModal.type === "suspend" 
                  ? `Temporarily suspend ${actionModal.student?.profile?.full_name}'s account. They won't be able to book sessions.`
                  : actionModal.type === "delete"
                    ? `Permanently delete ${actionModal.student?.profile?.full_name}'s account and all associated data. This action cannot be undone.`
                    : `Permanently block ${actionModal.student?.profile?.full_name}'s account. This action can be reversed later.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {actionModal.type !== "restore" && actionModal.type !== "delete" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for {actionModal.type === "suspend" ? "suspension" : "blocking"}</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal({ open: false, type: null, student: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleAccountAction}
              disabled={actionLoading || (actionModal.type !== "restore" && actionModal.type !== "delete" && !actionReason.trim())}
              variant={actionModal.type === "restore" ? "default" : "destructive"}
            >
              {actionLoading ? "Processing..." : actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Yes, Delete Account" : "Block Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
