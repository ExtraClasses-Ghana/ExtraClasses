import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText,
  User,
  Clock,
  Download,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface VerificationDocument {
  id: string;
  teacher_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface PendingTeacher {
  user_id: string;
  verification_status: string;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  documents: VerificationDocument[];
}

export default function AdminVerification() {
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<PendingTeacher | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PendingTeacher | null>(null);
  const [filterType, setFilterType] = useState<string>("pending");
  const { toast } = useToast();
  const { user } = useAuth();

  const VERIFICATION_STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "in_review", label: "In Review" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
  ] as const;

  useEffect(() => {
    fetchPendingVerifications();

    // Debounce the realtime fetches to avoid race conditions with optimistic updates
    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase
      .channel("admin-verification-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_profiles" },
        (payload) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            fetchPendingVerifications(true);
          }, 2000);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "verification_documents" },
        () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            fetchPendingVerifications(true);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
    };
  }, []); // Keep subscription independent

  useEffect(() => {
    fetchPendingVerifications();
  }, [filterType]);

  const fetchPendingVerifications = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let query = supabase.from("teacher_profiles").select("user_id, verification_status, created_at");
      
      if (filterType === "pending") {
        query = query.in("verification_status", ["pending", "in_review"]);
      } else if (filterType === "verified") {
        query = query.eq("verification_status", "verified");
      }

      const { data: teachers, error: teachersError } = await query;

      if (teachersError) throw teachersError;

      const teachersWithData = await Promise.all(
        (teachers || []).map(async (teacher) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("user_id", teacher.user_id)
            .maybeSingle();

          const { data: documents } = await supabase
            .from("verification_documents")
            .select("*")
            .eq("teacher_id", teacher.user_id);

          return {
            ...teacher,
            profile,
            documents: documents || [],
          };
        })
      );

      // Sort by status (in_review first, then pending) and then by date
      const sorted = teachersWithData.sort((a, b) => {
        if (a.verification_status === 'in_review' && b.verification_status !== 'in_review') return -1;
        if (a.verification_status !== 'in_review' && b.verification_status === 'in_review') return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setPendingTeachers(sorted as PendingTeacher[]);
    } catch (error) {
      console.error("Error fetching pending verifications:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const optimisticallyUpdateTeacherStatus = (teacherId: string, newStatus: string) => {
    if (filterType === "pending") {
      if (newStatus === "verified" || newStatus === "rejected") {
        setPendingTeachers((prev) => prev.filter((t) => t.user_id !== teacherId));
      } else {
        setPendingTeachers((prev) => prev.map((t) => 
          t.user_id === teacherId ? { ...t, verification_status: newStatus } : t
        ));
      }
    } else {
      if (newStatus !== "verified") {
        setPendingTeachers((prev) => prev.filter((t) => t.user_id !== teacherId));
      } else {
        setPendingTeachers((prev) => prev.map((t) => 
          t.user_id === teacherId ? { ...t, verification_status: newStatus } : t
        ));
      }
    }
  };

  const handleStatusChange = async (teacher: PendingTeacher, newStatus: string) => {
    setStatusUpdatingId(teacher.user_id);
    
    // Optimsitic UI Update (avoids disappearing and reappearing quickly)
    optimisticallyUpdateTeacherStatus(teacher.user_id, newStatus);
    
    try {
      const payload: { verification_status: string; is_verified?: boolean; onboarding_completed?: boolean } = {
        verification_status: newStatus,
      };
      if (newStatus === "verified") {
        payload.is_verified = true;
        payload.onboarding_completed = true;
      }

      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update(payload)
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      if (newStatus === "verified") {
        await supabase
          .from("profiles")
          .update({
            status: "active",
            status_updated_at: new Date().toISOString(),
            status_updated_by: user?.id || null,
          })
          .eq("user_id", teacher.user_id);

        await supabase
          .from("verification_documents")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
          })
          .eq("teacher_id", teacher.user_id);
      }

      toast({
        title: "Status updated",
        description: teacher.profile?.full_name + " is now " + (VERIFICATION_STATUS_OPTIONS.find((o) => o.value === newStatus)?.label ?? newStatus) + ".",
      });
      
    } catch (error: any) {
      // Revert optimistic update on failure
      fetchPendingVerifications(true);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleApprove = async (teacher: PendingTeacher) => {
    setProcessing(true);
    optimisticallyUpdateTeacherStatus(teacher.user_id, "verified");
    setSelectedTeacher(null);
    setReviewNotes("");

    try {
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ 
          verification_status: "verified",
          is_verified: true,
          onboarding_completed: true
        })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      const { error: profileStatusError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id || null,
        })
        .eq("user_id", teacher.user_id);

      if (profileStatusError) throw profileStatusError;

      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({ 
          status: "approved",
          admin_notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("teacher_id", teacher.user_id);

      if (docsError) throw docsError;

      toast({
        title: "Teacher verified!",
        description: teacher.profile?.full_name + " has been approved as a verified teacher.",
      });

    } catch (error: any) {
      fetchPendingVerifications(true);
      toast({
        title: "Error",
        description: error.message || "Failed to approve teacher",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (teacher: PendingTeacher) => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    optimisticallyUpdateTeacherStatus(teacher.user_id, "rejected");
    setSelectedTeacher(null);

    try {
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ verification_status: "rejected" })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({ 
          status: "rejected",
          admin_notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("teacher_id", teacher.user_id);

      if (docsError) throw docsError;

      toast({
        title: "Verification rejected",
        description: teacher.profile?.full_name + "'s verification has been rejected.",
      });

    } catch (error: any) {
      fetchPendingVerifications(true);
      toast({
        title: "Error",
        description: error.message || "Failed to reject teacher",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setReviewNotes("");
    }
  };

  const handleDelete = async (teacher: PendingTeacher) => {
    setProcessing(true);
    optimisticallyUpdateTeacherStatus(teacher.user_id, "rejected");
    setDeleteTarget(null);

    try {
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ verification_status: "rejected" })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({
          status: "rejected",
          admin_notes: "Deleted by admin.",
          reviewed_at: new Date().toISOString(),
        })
        .eq("teacher_id", teacher.user_id);

      if (docsError) throw docsError;

      toast({
        title: "Verification deleted",
        description: teacher.profile?.full_name + " has been removed from pending verification.",
      });

    } catch (error: any) {
      fetchPendingVerifications(true);
      toast({
        title: "Error",
        description: error.message || "Failed to delete verification",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickVerify = async (teacher: PendingTeacher) => {
    setProcessing(true);
    optimisticallyUpdateTeacherStatus(teacher.user_id, "verified");

    try {
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ 
          verification_status: "verified",
          is_verified: true,
          onboarding_completed: true
        })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      const { error: profileStatusError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id || null,
        })
        .eq("user_id", teacher.user_id);

      if (profileStatusError) throw profileStatusError;

      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({
          status: "approved",
          admin_notes: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("teacher_id", teacher.user_id);

      if (docsError) throw docsError;

      await supabase.from('admin_notifications').insert({
        type: 'teacher_verified',
        title: 'Teacher Verified',
        message: teacher.profile?.full_name + " has been verified and is now listed.",
        related_user_id: teacher.user_id,
      });

      toast({
        title: 'Teacher verified',
        description: teacher.profile?.full_name + " is now verified and visible in listings.",
      });

    } catch (error: any) {
      fetchPendingVerifications(true);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark teacher as verified',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "national_id":
        return "National ID";
      case "degree":
        return "Degree Certificate";
      case "teaching_certificate":
        return "Teaching Certificate";
      default:
        return type;
    }
  };

  const metrics = useMemo(() => {
    return {
      total: pendingTeachers.length,
      inReview: pendingTeachers.filter(t => t.verification_status === 'in_review').length,
    }
  }, [pendingTeachers]);

  return (
    <AdminDashboardLayout title="" subtitle="">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        {/* Background elements for Premium Glassmorphic feel */}
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        
        <div className="relative z-10 space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Teacher Verification
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Review and approve teacher verification requests safely to ensure platform quality.
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 items-center"
            >
              <div className="mr-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-white/20 h-11 rounded-xl shadow-inner font-bold text-foreground">
                    <SelectValue placeholder="View Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 glassmorphism shadow-xl">
                    <SelectItem value="pending" className="font-semibold text-amber-600 dark:text-amber-400">View Pending Queue</SelectItem>
                    <SelectItem value="verified" className="font-semibold text-green-600 dark:text-green-400">View Verified Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-2xl font-bold">{metrics.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Filtered</p>
              </div>
              <div className="w-px h-10 bg-white/20 my-auto hidden sm:block" />
              <div className="text-right hidden sm:block">
                <p className="text-2xl font-bold text-amber-500">{metrics.inReview}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Processing</p>
              </div>
            </motion.div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">Loading secure files...</p>
            </div>
          ) : pendingTeachers.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm p-12 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">All caught up!</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {filterType === "pending" 
                  ? "There are no pending verification requests at the moment. You've cleared the queue!" 
                  : "There are currently no verified teachers in this list."}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {pendingTeachers.map((teacher, index) => (
                  <motion.div
                    key={teacher.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden group hover:bg-white/50 transition-all duration-300">
                      <div className={"absolute top-0 left-0 w-1.5 h-full " + (teacher.verification_status === 'in_review' ? 'bg-amber-500' : 'bg-primary')} />
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center ring-1 ring-secondary/30">
                              {teacher.profile?.avatar_url ? (
                                <img src={teacher.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <User className="w-7 h-7 text-secondary" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-xl flex items-center gap-2">
                                {teacher.profile?.full_name || "Unknown Teacher"}
                                {teacher.verification_status === 'in_review' && (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs shadow-none">Processing</Badge>
                                )}
                              </h3>
                              <p className="text-muted-foreground">
                                {teacher.profile?.email}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-4 h-4 text-muted-foreground opacity-70" />
                                <span className="text-sm font-medium text-muted-foreground opacity-80">
                                  Submitted {new Date(teacher.created_at).toLocaleDateString()} at {new Date(teacher.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <Select
                              value={teacher.verification_status || "pending"}
                              onValueChange={(value) => handleStatusChange(teacher, value)}
                              disabled={statusUpdatingId === teacher.user_id}
                            >
                              <SelectTrigger className="w-[150px] bg-white/50 dark:bg-black/50 border-white/20 h-11 rounded-xl">
                                <div className="flex items-center gap-2">
                                  {statusUpdatingId === teacher.user_id && <Loader2 className="w-4 h-4 animate-spin" />}
                                  <SelectValue placeholder="Status" />
                                </div>
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-white/10 glassmorphism">
                                {VERIFICATION_STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="default"
                              size="default"
                              onClick={() => handleQuickVerify(teacher)}
                              disabled={processing || statusUpdatingId !== null}
                              className="h-11 rounded-xl bg-green-600 hover:bg-green-700 shadow-md gap-2 hidden sm:flex"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                          </div>
                        </div>

                        {/* Documents Section */}
                        <div className="mt-8">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Submitted Documents ({teacher.documents.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teacher.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center gap-3 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-primary/50 transition-colors group/doc"
                              >
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate text-foreground">
                                    {getDocumentTypeLabel(doc.document_type)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate opacity-80 mt-0.5">
                                    {doc.file_name}
                                  </p>
                                </div>
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-background shadow-sm hover:bg-primary hover:text-white rounded-lg transition-colors border border-border"
                                  title="View document safely"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions & Review bottom bar */}
                        <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Action required to make this teacher visible</span>
                          </div>
                          
                          <div className="flex flex-wrap justify-end gap-3 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedTeacher(teacher)}
                              className="rounded-xl h-10 px-6 bg-white/50 dark:bg-white/5 border-white/20 hover:bg-background"
                            >
                              <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                              Full Review
                            </Button>

                            <Button
                              variant="outline"
                              className="rounded-xl h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-white/20 bg-white/50 dark:bg-white/5"
                              disabled={processing}
                              onClick={() => setDeleteTarget(teacher)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                            
                            <Button
                              variant="default"
                              size="default"
                              onClick={() => handleQuickVerify(teacher)}
                              disabled={processing || statusUpdatingId !== null}
                              className="h-10 rounded-xl bg-green-600 hover:bg-green-700 shadow-md gap-2 sm:hidden flex flex-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
          <DialogContent className="max-w-2xl glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl p-0">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-primary to-blue-600" />
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  Review Details
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Thoroughly securely review the documentation before approving or rejecting.
                </DialogDescription>
              </DialogHeader>

              {selectedTeacher && (
                <div className="space-y-8">
                  {/* Info */}
                  <div className="flex justify-between items-center bg-white/5 dark:bg-black/20 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center ring-1 ring-secondary/30">
                        {selectedTeacher.profile?.avatar_url ? (
                          <img src={selectedTeacher.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-7 h-7 text-secondary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedTeacher.profile?.full_name}</h3>
                        <p className="text-muted-foreground">{selectedTeacher.profile?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents list vertical */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Secure Documents</h4>
                    {selectedTeacher.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{getDocumentTypeLabel(doc.document_type)}</p>
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-secondary/20 text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Download className="w-5 h-5" />
                        </div>
                      </a>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Review Notes / Reason</label>
                    <Textarea
                      placeholder="Required only if rejecting. Add internal notes here..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={4}
                      className="bg-background/50 rounded-xl resize-none border-white/20 focus:border-primary/50"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-3 mt-8 pt-6 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTeacher(null)}
                  disabled={processing}
                  className="rounded-xl px-6"
                >
                  Cancel
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="destructive"
                    onClick={() => selectedTeacher && handleReject(selectedTeacher)}
                    disabled={processing || !reviewNotes.trim()}
                    className="rounded-xl flex-1 sm:flex-none shadow-md"
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => selectedTeacher && handleApprove(selectedTeacher)}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 rounded-xl flex-1 sm:flex-none shadow-md"
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="glassmorphism-dialog border-white/10 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Delete verification request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reject and remove <strong className="text-foreground">{deleteTarget?.profile?.full_name || "this teacher"}</strong>'s verification from the queue immediately. They will see a "rejected" status and can re-submit later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={processing} className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={processing}
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-md"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Request"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
}
