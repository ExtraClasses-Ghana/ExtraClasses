import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  IdCard,
  GraduationCap,
  Award,
  User,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface DocumentType {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
  required: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: "national_id",
    label: "National ID / Ghana Card",
    description: "A clear photo of your valid national ID card",
    icon: IdCard,
    required: true,
  },
  {
    id: "facial_verification",
    label: "Facial Verification Photo",
    description: "A clear selfie holding your ID next to your face",
    icon: User,
    required: true,
  },
  {
    id: "degree",
    label: "Degree Certificate",
    description: "Your highest educational qualification",
    icon: GraduationCap,
    required: true,
  },
  {
    id: "qualifications",
    label: "Additional Qualifications",
    description: "Other relevant certifications (WASSCE, professional certs)",
    icon: BookOpen,
    required: false,
  },
  {
    id: "teaching_certificate",
    label: "Teaching Certificate",
    description: "Professional teaching certification (if available)",
    icon: Award,
    required: false,
  },
];

interface UploadedDoc {
  type: string;
  fileName: string;
  status: "uploading" | "success" | "error";
}

export function DocumentUploadModal({ isOpen, onClose, onComplete }: DocumentUploadModalProps) {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUploadType || !user) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WebP, or PDF file",
        variant: "destructive",
      });
      return;
    }

    // Set uploading state
    setUploadedDocs((prev) => ({
      ...prev,
      [currentUploadType]: {
        type: currentUploadType,
        fileName: file.name,
        status: "uploading",
      },
    }));

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${currentUploadType}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await supabase.from("verification_documents").insert({
        teacher_id: user.id,
        document_type: currentUploadType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: "pending",
      });

      if (dbError) throw dbError;

      setUploadedDocs((prev) => ({
        ...prev,
        [currentUploadType]: {
          ...prev[currentUploadType],
          status: "success",
        },
      }));

      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadedDocs((prev) => ({
        ...prev,
        [currentUploadType]: {
          ...prev[currentUploadType],
          status: "error",
        },
      }));

      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setCurrentUploadType(null);
  };

  const triggerFileUpload = (docType: string) => {
    setCurrentUploadType(docType);
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!user) return;

    const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
    const uploadedRequiredDocs = requiredDocs.filter(
      (d) => uploadedDocs[d.id]?.status === "success"
    );

    if (uploadedRequiredDocs.length < requiredDocs.length) {
      toast({
        title: "Missing documents",
        description: "Please upload all required documents",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update teacher profile verification status
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ verification_status: "pending" })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Documents submitted!",
        description: "Your documents are now under review. We'll notify you once verified.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit documents",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allRequiredUploaded = DOCUMENT_TYPES.filter((d) => d.required).every(
    (d) => uploadedDocs[d.id]?.status === "success"
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-6 text-white relative flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close modal"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-display font-bold">Verify Your Identity</h2>
            <p className="text-white/80 mt-1">
              Upload your documents to become a verified teacher
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload document file"
          />

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                <strong>Why verify?</strong> Verified teachers get a badge on their profile, 
                appear higher in search results, and build more trust with parents and students.
              </p>
            </div>

            {DOCUMENT_TYPES.map((docType) => {
              const uploadedDoc = uploadedDocs[docType.id];
              const IconComponent = docType.icon;

              return (
                <div
                  key={docType.id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    uploadedDoc?.status === "success"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : uploadedDoc?.status === "error"
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      uploadedDoc?.status === "success" 
                        ? "bg-green-100 text-green-600 dark:bg-green-900" 
                        : "bg-muted"
                    }`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{docType.label}</h4>
                        {docType.required ? (
                          <span className="text-xs text-destructive">Required</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Optional</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{docType.description}</p>

                      {uploadedDoc && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          {uploadedDoc.status === "uploading" && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="text-muted-foreground">Uploading...</span>
                            </>
                          )}
                          {uploadedDoc.status === "success" && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">{uploadedDoc.fileName}</span>
                            </>
                          )}
                          {uploadedDoc.status === "error" && (
                            <>
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-destructive">Upload failed</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerFileUpload(docType.id)}
                      disabled={uploadedDoc?.status === "uploading"}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadedDoc?.status === "success" ? "Replace" : "Upload"}
                    </Button>
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground text-center">
              Accepted formats: JPEG, PNG, WebP, PDF (max 10MB per file)
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-6 flex justify-between flex-shrink-0">
            <Button variant="ghost" onClick={onClose}>
              Skip for now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allRequiredUploaded || isSubmitting}
              className="btn-coral"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
