import { useState, useEffect, useRef } from "react";
import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  FileText, Upload, CheckCircle, XCircle, Clock, 
  RefreshCw, Loader2, Eye, Download 
} from "lucide-react";

interface VerificationDoc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const documentTypes = [
  { value: "national_id", label: "National ID / Ghana Card" },
  { value: "facial_verification", label: "Facial Verification (Selfie with ID)" },
  { value: "degree", label: "Degree Certificate" },
  { value: "qualifications", label: "Additional Qualifications" },
  { value: "teaching_certificate", label: "Teaching Certificate" },
];

export default function TeacherCredentials() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("teacher_id", user?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File must be less than 5MB");
      return;
    }

    setUploading(docType);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${docType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      // Check if document already exists
      const existing = documents.find(d => d.document_type === docType);

      if (existing) {
        // Update existing document - reset status to pending
        const { error } = await supabase
          .from("verification_documents")
          .update({
            file_name: file.name,
            file_url: urlData.publicUrl,
            status: "pending",
            admin_notes: null,
          })
          .eq("id", existing.id);

        if (error) throw error;

        // Notify admin
        await supabase.from("admin_notifications").insert({
          type: "verification_pending",
          title: "Credential Update",
          message: `A teacher has updated their ${docType.replace(/_/g, " ")} and it needs re-verification.`,
          related_user_id: user.id,
        });

        toast.success("Document updated! Admin will review it shortly.");
      } else {
        // Insert new document
        const { error } = await supabase
          .from("verification_documents")
          .insert({
            teacher_id: user.id,
            document_type: docType,
            file_name: file.name,
            file_url: urlData.publicUrl,
            status: "pending",
          });

        if (error) throw error;

        // Notify admin
        await supabase.from("admin_notifications").insert({
          type: "verification_pending",
          title: "New Credential Uploaded",
          message: `A teacher has uploaded a new ${docType.replace(/_/g, " ")} for verification.`,
          related_user_id: user.id,
        });

        toast.success("Document uploaded! Admin will review it shortly.");
      }

      fetchDocuments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500">Pending Review</Badge>;
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            My Credentials
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your verification documents
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {documentTypes.map((docType) => {
              const doc = documents.find(d => d.document_type === docType.value);
              
              return (
                <Card key={docType.value} className={doc?.status === "rejected" ? "border-destructive/50" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          doc?.status === "approved" ? "bg-green-500/10" :
                          doc?.status === "rejected" ? "bg-destructive/10" :
                          doc ? "bg-amber-500/10" : "bg-muted"
                        }`}>
                          {doc ? getStatusIcon(doc.status) : <FileText className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{docType.label}</h3>
                          {doc ? (
                            <>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {doc.file_name}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                {getStatusBadge(doc.status)}
                                <span className="text-xs text-muted-foreground">
                                  Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {doc.status === "rejected" && doc.admin_notes && (
                                <div className="mt-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                                  <p className="text-sm text-destructive font-medium">Rejection Reason:</p>
                                  <p className="text-sm text-muted-foreground mt-1">{doc.admin_notes}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              Not uploaded yet
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.file_url, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <input
                          ref={(el) => { fileInputRefs.current[docType.value] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          aria-label={`Upload ${docType.label}`}
                          title={`Upload ${docType.label}`}
                          onChange={(e) => handleFileUpload(docType.value, e)}
                        />
                        <Button
                          variant={doc ? "outline" : "default"}
                          size="sm"
                          onClick={() => fileInputRefs.current[docType.value]?.click()}
                          disabled={uploading === docType.value}
                        >
                          {uploading === docType.value ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : doc ? (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {doc ? "Update" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> When you update a credential, it will be sent to the admin for re-verification. 
              You'll be notified once your updated document is reviewed. Accepted formats: Images (JPG, PNG) and PDF. Max size: 5MB.
            </p>
          </CardContent>
        </Card>
      </div>
    </TeacherDashboardLayout>
  );
}
