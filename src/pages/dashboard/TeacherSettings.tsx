import { useState, useEffect, useRef } from "react";
import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  User, Bell, Lock, CreditCard, Camera, Loader2, Save, GraduationCap, 
  Trash2, AlertTriangle, CheckCircle, XCircle, FileText, Upload, Trophy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ImageCropModal } from "@/components/shared/ImageCropModal";

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah", "North East"
];

const allSubjects = [
  "Mathematics", "English", "Science", "Social Studies", "French",
  "ICT", "Physics", "Chemistry", "Biology", "Geography", "History",
  "Economics", "Accounting", "Literature", "Music", "Art"
];

const qualificationOptions = [
  "Bachelor's Degree", "Master's Degree", "PhD", "Teaching Certificate",
  "Professional Certification", "WASSCE Examiner", "Other"
];

const languageOptions = ["English", "Twi", "Ga", "Ewe", "Hausa", "French"];

export default function TeacherSettings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: string;
    rejectionReason?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    region: "",
    bio: "",
    hourly_rate: 0,
    subjects: [] as string[],
    teaching_mode: "both",
    experience_years: 0,
    qualifications: [] as string[],
    languages: [] as string[],
    achievements: [] as string[],
  });
  const [newAchievement, setNewAchievement] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Image crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email_bookings: true,
    email_messages: true,
    email_reviews: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        region: profile.region || "",
      }));
      setAvatarUrl(profile.avatar_url);
    }
    fetchTeacherProfile();
    fetchVerificationStatus();
  }, [profile, user]);

  const fetchTeacherProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("teacher_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setFormData(prev => ({
        ...prev,
        bio: data.bio || "",
        hourly_rate: data.hourly_rate || 0,
        subjects: data.subjects || [],
        teaching_mode: data.teaching_mode || "both",
        experience_years: data.experience_years || 0,
        qualifications: data.qualifications || [],
        languages: data.languages || [],
        achievements: (data as any).achievements || [],
      }));
    }
  };

  const fetchVerificationStatus = async () => {
    if (!user) return;

    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("verification_status")
      .eq("user_id", user.id)
      .single();

    if (teacherProfile) {
      const { data: docs } = await supabase
        .from("verification_documents")
        .select("status, admin_notes")
        .eq("teacher_id", user.id)
        .eq("status", "rejected")
        .limit(1);

      setVerificationStatus({
        status: teacherProfile.verification_status || "pending",
        rejectionReason: docs?.[0]?.admin_notes || undefined,
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedFile(file);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, croppedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      toast.success("Profile photo updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      setSelectedFile(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          region: formData.region,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .update({
          bio: formData.bio,
          hourly_rate: formData.hourly_rate,
          subjects: formData.subjects,
          teaching_mode: formData.teaching_mode,
          experience_years: formData.experience_years,
          qualifications: formData.qualifications,
          languages: formData.languages,
          achievements: formData.achievements,
        } as any)
        .eq("user_id", user.id);

      if (teacherError) throw teacherError;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;
      
      toast.success("Password updated successfully");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      await signOut();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account. Please contact support.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const toggleQualification = (qual: string) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.includes(qual)
        ? prev.qualifications.filter(q => q !== qual)
        : [...prev.qualifications, qual]
    }));
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
  };

  const getVerificationIcon = () => {
    switch (verificationStatus?.status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your teacher profile and preferences
          </p>
        </div>

        {/* Verification Status Alert */}
        {verificationStatus && verificationStatus.status !== "verified" && (
          <Card className={verificationStatus.status === "rejected" ? "border-destructive/50" : "border-yellow-500/50"}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {getVerificationIcon()}
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">
                    Verification {verificationStatus.status}
                  </h3>
                  {verificationStatus.status === "rejected" && verificationStatus.rejectionReason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Reason:</strong> {verificationStatus.rejectionReason}
                    </p>
                  )}
                  {verificationStatus.status === "pending" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Your documents are under review. You'll be notified once approved.
                    </p>
                  )}
                  {verificationStatus.status === "rejected" && (
                    <Button size="sm" className="mt-3" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Re-upload Documents
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information visible to students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar with Upload & Crop */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarUrl || ""} />
                <AvatarFallback className="bg-secondary/10 text-secondary text-xl">
                  {profile?.full_name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Upload profile photo"
                  title="Upload profile photo"
                  onChange={handleFileSelect}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  {uploadingImage ? "Uploading..." : "Change Photo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or WebP. You'll crop before uploading.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Location/Region</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell students about your teaching experience and style..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Teaching Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Teaching Settings
            </CardTitle>
            <CardDescription>
              Configure your teaching preferences, rates, and qualifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (GH₵)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years">Years of Experience</Label>
                <Input
                  id="experience_years"
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: Number(e.target.value) })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teaching_mode">Teaching Mode</Label>
                <Select
                  value={formData.teaching_mode}
                  onValueChange={(value) => setFormData({ ...formData, teaching_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online Only</SelectItem>
                    <SelectItem value="in-person">In-Person Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subjects You Teach</Label>
              <div className="flex flex-wrap gap-2">
                {allSubjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant={formData.subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qualifications</Label>
              <div className="flex flex-wrap gap-2">
                {qualificationOptions.map((qual) => (
                  <Badge
                    key={qual}
                    variant={formData.qualifications.includes(qual) ? "secondary" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleQualification(qual)}
                  >
                    {qual}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => (
                  <Badge
                    key={lang}
                    variant={formData.languages.includes(lang) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Achievements & Awards
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Best Teacher Award 2023"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newAchievement.trim() && !formData.achievements.includes(newAchievement.trim())) {
                        setFormData(prev => ({ ...prev, achievements: [...prev.achievements, newAchievement.trim()] }));
                        setNewAchievement("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (newAchievement.trim() && !formData.achievements.includes(newAchievement.trim())) {
                      setFormData(prev => ({ ...prev, achievements: [...prev.achievements, newAchievement.trim()] }));
                      setNewAchievement("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.achievements.map((ach) => (
                  <Badge key={ach} variant="secondary" className="px-3 py-1">
                    🏆 {ach}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        achievements: prev.achievements.filter(a => a !== ach)
                      }))}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Booking Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when students book sessions
                </p>
              </div>
              <Switch
                checked={notifications.email_bookings}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, email_bookings: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Messages</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive a new message
                </p>
              </div>
              <Switch
                checked={notifications.email_messages}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, email_messages: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Reviews</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when students leave reviews
                </p>
              </div>
              <Switch
                checked={notifications.email_reviews}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, email_reviews: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Manage your payout preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mobile Money</p>
                <p className="text-sm text-muted-foreground">
                  Add or update your mobile money details
                </p>
              </div>
              <Button variant="outline">Configure</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
              variant="outline"
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account, profile, and all data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account, remove your profile from all listings, and delete all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Yes, delete my account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedFile(null);
          }}
          imageFile={selectedFile}
          onCropComplete={handleCropComplete}
        />
      )}
    </TeacherDashboardLayout>
  );
}
