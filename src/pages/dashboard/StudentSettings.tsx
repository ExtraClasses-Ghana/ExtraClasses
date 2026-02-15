import { useState, useEffect, useRef } from "react";
import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { User, Bell, Lock, Camera, Loader2, Save, Trash2 } from "lucide-react";
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

export default function StudentSettings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    region: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email_bookings: true,
    email_messages: true,
    email_promotions: false,
  });

  // Image crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        region: profile.region || "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB for raw file (will be cropped smaller)
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
    // Reset input
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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          region: formData.region,
        })
        .eq("user_id", user.id);

      if (error) throw error;
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

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar with Upload & Crop */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarUrl || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
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
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
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
                <Label htmlFor="region">Region</Label>
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
                <p className="font-medium">Booking Confirmations</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when sessions are booked or changed
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
                <p className="font-medium">Promotional Emails</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates about discounts and new features
                </p>
              </div>
              <Switch
                checked={notifications.email_promotions}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, email_promotions: checked })
                }
              />
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
                  Permanently delete your account and all data
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
                      account and remove all your data from our servers.
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
    </StudentDashboardLayout>
  );
}
