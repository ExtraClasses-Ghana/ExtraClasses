import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  XCircle,
  Star,
  Eye,
  Ban,
  AlertTriangle,
  RotateCcw,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
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

interface Teacher {
  user_id: string;
  verification_status: string;
  is_verified: boolean;
  subjects: string[];
  hourly_rate: number;
  rating: number;
  total_sessions: number;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    region: string | null;
    status: string;
    status_reason: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export default function AdminTeachers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [recentPublished, setRecentPublished] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "suspend" | "block" | "restore" | "delete" | null;
    teacher: Teacher | null;
  }>({ open: false, type: null, teacher: null });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teacherProfiles, error } = await supabase
        .from("teacher_profiles")
        .select("user_id, verification_status, is_verified, subjects, hourly_rate, rating, total_sessions, created_at, updated_at");

      if (error) throw error;

      const teachersWithProfiles = await Promise.all(
        (teacherProfiles || []).map(async (teacher) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url, region, status, status_reason")
            .eq("user_id", teacher.user_id)
            .maybeSingle();

          return { ...teacher, profile };
        })
      );

      setTeachers(teachersWithProfiles);

      // Compute recent published/verified teachers
      const published = teachersWithProfiles
        .filter(t => t.verification_status === 'verified' || t.is_verified)
        .sort((a, b) => {
          const ad = new Date(a.updated_at || a.profile?.status_updated_at || a.created_at || 0).getTime();
          const bd = new Date(b.updated_at || b.profile?.status_updated_at || b.created_at || 0).getTime();
          return bd - ad;
        })
        .slice(0, 6);

      setRecentPublished(published as Teacher[]);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountAction = async () => {
    if (!actionModal.teacher || !actionModal.type) return;

    setActionLoading(true);
    try {
      if (actionModal.type === "delete") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await supabase.functions.invoke("delete-account", {
          body: { target_user_id: actionModal.teacher.user_id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) throw response.error;

        toast({
          title: "Success",
          description: "Teacher account has been deleted",
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
          .eq("user_id", actionModal.teacher.user_id);

        if (error) throw error;

        await supabase.from("admin_notifications").insert({
          type: `teacher_${actionModal.type}ed`,
          title: `Teacher Account ${actionModal.type === "restore" ? "Restored" : actionModal.type === "suspend" ? "Suspended" : "Blocked"}`,
          message: `${actionModal.teacher.profile?.full_name}'s account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}. Reason: ${actionReason || "N/A"}`,
          related_user_id: actionModal.teacher.user_id,
        });

        toast({
          title: "Success",
          description: `Teacher account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}`,
        });
      }

      setActionModal({ open: false, type: null, teacher: null });
      setActionReason("");
      fetchTeachers();
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

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Unverified
      </Badge>
    );
  };

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
    return null;
  };

  return (
    <AdminDashboardLayout
      title="Manage Teachers"
      subtitle="View, manage, and moderate all registered teachers"
    >
      {/* Published / Recently Approved Teachers */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Published Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPublished.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recently published teachers</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentPublished.map((t) => (
                  <div key={t.user_id} className="flex items-center gap-3 p-3 border rounded">
                    <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center overflow-hidden">
                      {t.profile?.avatar_url ? (
                        <img src={t.profile.avatar_url} alt={t.profile?.full_name || 'Teacher'} className="w-full h-full object-cover" />
                      ) : (
                        <GraduationCap className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/teacher/${t.user_id}`} className="font-medium hover:underline">
                        {t.profile?.full_name || 'Teacher'}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">{t.profile?.region || '-'}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-500/10 text-green-500">Verified</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers ({filteredTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teachers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Teacher</th>
                    <th className="text-left py-3 px-4 font-medium">Region</th>
                    <th className="text-left py-3 px-4 font-medium">Subjects</th>
                    <th className="text-left py-3 px-4 font-medium">Rate</th>
                    <th className="text-left py-3 px-4 font-medium">Rating</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Account</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.user_id} className="border-b border-border">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.profile?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{teacher.profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {teacher.profile?.region || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(teacher.subjects || []).slice(0, 2).map((subject) => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {(teacher.subjects || []).length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{teacher.subjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        GH₵{teacher.hourly_rate || 0}/hr
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>{teacher.rating || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(teacher.verification_status, teacher.is_verified || false)}
                      </td>
                      <td className="py-3 px-4">
                        {getAccountStatusBadge(teacher.profile?.status) || (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/teacher/${teacher.user_id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          
                          {teacher.profile?.status === "blocked" || teacher.profile?.status === "suspended" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActionModal({ open: true, type: "restore", teacher })}
                              className="text-green-500 hover:text-green-600"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "suspend", teacher })}
                                className="text-amber-500 hover:text-amber-600"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "block", teacher })}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActionModal({ open: true, type: "delete", teacher })}
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
      <Dialog open={actionModal.open} onOpenChange={(open) => !open && setActionModal({ open: false, type: null, teacher: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Delete Account" : "Block Account"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.type === "restore" 
                ? `Restore ${actionModal.teacher?.profile?.full_name}'s account to active status.`
                : actionModal.type === "suspend" 
                  ? `Temporarily suspend ${actionModal.teacher?.profile?.full_name}'s account. They won't be able to receive bookings.`
                  : actionModal.type === "delete"
                    ? `Permanently delete ${actionModal.teacher?.profile?.full_name}'s account and all associated data. This action cannot be undone.`
                    : `Permanently block ${actionModal.teacher?.profile?.full_name}'s account. This action can be reversed later.`
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
            <Button variant="outline" onClick={() => setActionModal({ open: false, type: null, teacher: null })}>
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
