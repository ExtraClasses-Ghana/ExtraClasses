import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Save, Loader2 } from "lucide-react";

interface SystemSettings {
  platform_fee_percentage: number;
  min_hourly_rate: number;
  max_hourly_rate: number;
  require_verification: boolean;
  auto_approve_sessions: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    platform_fee_percentage: 10,
    min_hourly_rate: 20,
    max_hourly_rate: 200,
    require_verification: true,
    auto_approve_sessions: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        const newSettings: Partial<SystemSettings> = {};
        data.forEach((setting) => {
          if (setting.key === 'platform_fee_percentage' && typeof setting.value === 'number') {
            newSettings.platform_fee_percentage = setting.value;
          } else if (setting.key === 'min_hourly_rate' && typeof setting.value === 'number') {
            newSettings.min_hourly_rate = setting.value;
          } else if (setting.key === 'max_hourly_rate' && typeof setting.value === 'number') {
            newSettings.max_hourly_rate = setting.value;
          } else if (setting.key === 'require_verification' && typeof setting.value === 'boolean') {
            newSettings.require_verification = setting.value;
          } else if (setting.key === 'auto_approve_sessions' && typeof setting.value === 'boolean') {
            newSettings.auto_approve_sessions = setting.value;
          }
        });

        setSettings((prev) => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const settingsToSave = Object.entries(settings);

      for (const [key, value] of settingsToSave) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              key,
              value,
              updated_by: user.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
          );

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout
      title="Platform Settings"
      subtitle="Configure system-wide settings"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Fee Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Fee & Rate Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platformFee">Platform Fee (%)</Label>
                <Input
                  id="platformFee"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.platform_fee_percentage}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      platform_fee_percentage: Number(e.target.value),
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Percentage deducted from each session payment
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minRate">Min Hourly Rate (GH₵)</Label>
                  <Input
                    id="minRate"
                    type="number"
                    min="0"
                    value={settings.min_hourly_rate}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        min_hourly_rate: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRate">Max Hourly Rate (GH₵)</Label>
                  <Input
                    id="maxRate"
                    type="number"
                    min="0"
                    value={settings.max_hourly_rate}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        max_hourly_rate: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Verification & Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Teacher Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Teachers must be verified to accept bookings
                  </p>
                </div>
                <Switch
                  checked={settings.require_verification}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      require_verification: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Approve Sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve session bookings
                  </p>
                </div>
                <Switch
                  checked={settings.auto_approve_sessions}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      auto_approve_sessions: checked,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}
    </AdminDashboardLayout>
  );
}
