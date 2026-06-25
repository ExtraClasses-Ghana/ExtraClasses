import { useState, useEffect, useRef } from "react";
import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CredentialDeleteWarning } from "@/components/teacher/CredentialDeleteWarning";
import { 
  FileText, Upload, CheckCircle, XCircle, Clock, 
  RefreshCw, Loader2, Eye, Download, Trash2, Camera
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  { value: "ghana_card_front", label: "Ghana Card - Front Side" },
  { value: "ghana_card_back", label: "Ghana Card - Back Side" },
  { value: "selfie_image", label: "Selfie Photo" },
  { value: "degree", label: "Degree Certificate" },
  { value: "qualifications", label: "Additional Qualifications" },
  { value: "teaching_certificate", label: "Teaching Certificate" },
];

export default function TeacherCredentials() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<VerificationDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [teacherStatus, setTeacherStatus] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ghana Card & Camera states
  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [savingCardNumber, setSavingCardNumber] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDocuments(data || []);

      // Fetch teacher profile status
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("verification_status, ghana_card_number")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (profile) {
        setTeacherStatus(profile.verification_status);
        setGhanaCardNumber(profile.ghana_card_number || "");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGhanaCard = async () => {
    if (!user) return;
    
    // Validate GHA-XXXXXXXXX-X format
    const regex = /^GHA-\d{9}-\d$/;
    if (!regex.test(ghanaCardNumber)) {
      toast.error("Invalid Ghana Card Number format. It must follow: GHA-XXXXXXXXX-X (e.g., GHA-123456789-0)");
      return;
    }

    setSavingCardNumber(true);
    try {
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ ghana_card_number: ghanaCardNumber })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Ghana Card Number saved successfully!");
    } catch (error: any) {
      console.error("Error saving card number:", error);
      toast.error(error.message || "Failed to save Ghana Card Number");
    } finally {
      setSavingCardNumber(false);
    }
  };

  const startCamera = async () => {
    setCapturedImage(null);
    setCameraOpen(true);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please verify permissions or upload a selfie image file instead.");
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
    }
  };

  const handleUploadCaptured = async () => {
    if (!capturedImage || !user) return;
    setUploading("selfie_image");
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      
      await uploadDirectFile("selfie_image", file);
      stopCamera();
    } catch (error: any) {
      console.error("Selfie upload error:", error);
      toast.error("Failed to upload captured selfie");
    } finally {
      setUploading(null);
    }
  };

  const uploadDirectFile = async (docType: string, file: File) => {
    if (!user) return;
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
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
      await uploadDirectFile(docType, file);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteClick = (doc: VerificationDoc) => {
    setSelectedDocForDelete(doc);
    setDeleteWarningOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDocForDelete || !user) return;

    setIsDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = selectedDocForDelete.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/"); // Gets the last two parts (user_id/filename)

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("verification-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue with DB deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("verification_documents")
        .delete()
        .eq("id", selectedDocForDelete.id);

      if (dbError) throw dbError;

      // Log the deletion action
      const { error: logError } = await supabase
        .from("admin_notifications")
        .insert({
          type: "new_report",
          title: "Credential Deleted",
          message: `Teacher deleted their ${selectedDocForDelete.document_type.replace(/_/g, " ")} credential. This action has been logged.`,
          related_user_id: user.id,
          related_entity_id: selectedDocForDelete.id,
        });

      if (logError) {
        console.error("Logging error:", logError);
      }

      // Update local state
      setDocuments(documents.filter(d => d.id !== selectedDocForDelete.id));

      toast.error("Credential deleted. Admin has been notified.", {
        description: "Your account will be reviewed.",
      });

      setDeleteWarningOpen(false);
      setSelectedDocForDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete credential");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteWarningOpen(false);
    setSelectedDocForDelete(null);
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              My Credentials
            </h1>
            {teacherStatus === 'verified' && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-500 px-3 py-1 flex items-center shadow-sm">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Approved Teacher
              </Badge>
            )}
            {teacherStatus === 'pending' && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500 px-3 py-1 flex items-center shadow-sm">
                <Clock className="w-4 h-4 mr-1.5" />
                Pending Review
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            View and manage your verification documents
          </p>
        </div>

        {/* Ghana Card Number Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ghana Card Registration</CardTitle>
            <CardDescription>
              Please enter your unique Ghana Card Number (Format: GHA-XXXXXXXXX-X)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <Label htmlFor="ghanaCardNumber" className="font-semibold">Ghana Card Number</Label>
                <Input
                  id="ghanaCardNumber"
                  value={ghanaCardNumber}
                  onChange={(e) => setGhanaCardNumber(e.target.value)}
                  placeholder="GHA-123456789-0"
                  className="font-mono text-base uppercase"
                />
              </div>
              <Button
                onClick={handleSaveGhanaCard}
                disabled={savingCardNumber || !ghanaCardNumber}
                className="w-full sm:w-auto h-10 px-6 bg-primary text-white"
              >
                {savingCardNumber ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Card Number
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format check: Starts with GHA-, followed by 9 digits, a dash, and a trailing digit.
            </p>
          </CardContent>
        </Card>

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
                        {docType.value === "selfie_image" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={startCamera}
                            disabled={uploading === "selfie_image"}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Take Photo
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
                        {doc && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(doc)}
                            disabled={isDeleting || uploading === docType.value}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete this credential"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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

        <CredentialDeleteWarning
          isOpen={deleteWarningOpen}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          documentType={selectedDocForDelete?.document_type || ""}
          isDeleting={isDeleting}
        />

        {/* Camera capture modal */}
        <Dialog open={cameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); }}>
          <DialogContent className="max-w-lg bg-card border-border shadow-2xl rounded-2xl overflow-hidden p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Capture Selfie
              </DialogTitle>
              <DialogDescription>
                Take a selfie photo for identity verification. Access will be requested for your camera.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 flex flex-col items-center gap-4">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {!cameraStream && (
                      <Loader2 className="absolute w-8 h-8 text-white/50 animate-spin" />
                    )}
                  </>
                ) : (
                  <img
                    src={capturedImage}
                    alt="Captured selfie"
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}
              </div>

              <div className="flex gap-3 w-full justify-end">
                <Button
                  variant="outline"
                  onClick={stopCamera}
                  disabled={uploading === "selfie_image"}
                >
                  Cancel
                </Button>

                {!capturedImage ? (
                  <Button
                    onClick={capturePhoto}
                    disabled={!cameraStream}
                    className="bg-primary text-white"
                  >
                    Capture
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setCapturedImage(null)}
                      disabled={uploading === "selfie_image"}
                    >
                      Retake
                    </Button>
                    <Button
                      onClick={handleUploadCaptured}
                      disabled={uploading === "selfie_image"}
                      className="bg-green-600 hover:bg-green-700 text-white animate-fade-in"
                    >
                      {uploading === "selfie_image" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Use Photo & Upload
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TeacherDashboardLayout>
  );
}
