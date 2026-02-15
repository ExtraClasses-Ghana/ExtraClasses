import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Download
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      // Fetch teachers with pending verification
      const { data: teachers, error: teachersError } = await supabase
        .from("teacher_profiles")
        .select("user_id, verification_status, created_at")
        .eq("verification_status", "pending");

      if (teachersError) throw teachersError;

      // For each teacher, fetch their profile and documents
      const teachersWithData = await Promise.all(
        (teachers || []).map(async (teacher) => {
          // Fetch profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("user_id", teacher.user_id)
            .maybeSingle();

          // Fetch documents
          const { data: documents } = await supabase
            .from("verification_documents")
            .select("*")
            .eq("teacher_id", teacher.user_id)
            .eq("status", "pending");

          return {
            ...teacher,
            profile,
            documents: documents || [],
          };
        })
      );

      setPendingTeachers(teachersWithData);
    } catch (error) {
      console.error("Error fetching pending verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (teacher: PendingTeacher) => {
    setProcessing(true);
    try {
      // Update teacher profile
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ 
          verification_status: "verified",
          is_verified: true,
          onboarding_completed: true
        })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      // Ensure public profile is active so students can see the teacher
      const { error: profileStatusError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id || null,
        })
        .eq("user_id", teacher.user_id);

      if (profileStatusError) throw profileStatusError;

      // Update all documents
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
        description: `${teacher.profile?.full_name} has been approved as a verified teacher.`,
      });

      setSelectedTeacher(null);
      setReviewNotes("");
      fetchPendingVerifications();
    } catch (error: any) {
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
    try {
      // Update teacher profile
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ verification_status: "rejected" })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      // Update all documents
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
        description: `${teacher.profile?.full_name}'s verification has been rejected.`,
      });

      setSelectedTeacher(null);
      setReviewNotes("");
      fetchPendingVerifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject teacher",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickVerify = async (teacher: PendingTeacher) => {
    setProcessing(true);
    try {
      // Update teacher profile
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({ 
          verification_status: "verified",
          is_verified: true,
          onboarding_completed: true
        })
        .eq("user_id", teacher.user_id);

      if (profileError) throw profileError;

      // Update public profile status so they appear in listings
      const { error: profileStatusError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id || null,
        })
        .eq("user_id", teacher.user_id);

      if (profileStatusError) throw profileStatusError;

      // Mark documents approved
      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({
          status: "approved",
          admin_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("teacher_id", teacher.user_id);

      if (docsError) throw docsError;

      // Optionally notify admin/users via notifications table
      await supabase.from('admin_notifications').insert({
        type: 'teacher_verified',
        title: 'Teacher Verified',
        message: `${teacher.profile?.full_name} has been verified and is now listed.`,
        related_user_id: teacher.user_id,
      });

      toast({
        title: 'Teacher verified',
        description: `${teacher.profile?.full_name} is now verified and visible in listings.`,
      });

      fetchPendingVerifications();
    } catch (error: any) {
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

  return (
    <AdminDashboardLayout
      title="Teacher Verification"
      subtitle="Review and approve teacher verification requests"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : pendingTeachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">No pending verification requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingTeachers.map((teacher) => (
            <Card key={teacher.user_id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">
                        {teacher.profile?.full_name || "Unknown Teacher"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {teacher.profile?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Submitted {new Date(teacher.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Review
                    </Badge>
                  </div>
                </div>

                {/* Documents */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Submitted Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {teacher.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getDocumentTypeLabel(doc.document_type)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.file_name}
                          </p>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-muted rounded-lg"
                          title="View document"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickVerify(teacher)}
                    disabled={processing}
                    title="Quick verify"
                    className="mr-2"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedTeacher(teacher)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              Review the submitted documents and approve or reject this teacher
            </DialogDescription>
          </DialogHeader>

          {selectedTeacher && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedTeacher.profile?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTeacher.profile?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Documents to Review</h4>
                {selectedTeacher.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="w-6 h-6 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                      <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                    </div>
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </a>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add notes about this verification (required for rejection)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedTeacher(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTeacher && handleReject(selectedTeacher)}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedTeacher && handleApprove(selectedTeacher)}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
