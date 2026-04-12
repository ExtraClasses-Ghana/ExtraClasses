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
import { Settings, Save, Loader2, DollarSign, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

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
        title: "Settings Saved",
        description: "Platform core settings have been updated successfully.",
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
    <AdminDashboardLayout title="" subtitle="">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        {/* Dynamic Glassmorphism Background */}
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Platform Settings
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Configure system-wide parameters, fees, and verification rules.
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-xl shadow-md gap-2">
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? "Saving Changes..." : "Save Settings"}
              </Button>
            </motion.div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
              
              {/* Fee Settings */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg h-full transition-all duration-300 hover:bg-white/50">
                  <CardHeader className="border-b border-border/50 bg-muted/20">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <div className="p-2 rounded-lg bg-green-500/10 ring-1 ring-green-500/30">
                        <DollarSign className="w-5 h-5 text-green-500" />
                      </div>
                      Fee & Rate Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label htmlFor="platformFee" className="text-base font-semibold">Platform Fee Percentage</Label>
                        <span className="text-primary font-bold">{settings.platform_fee_percentage}%</span>
                      </div>
                      <div className="relative">
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
                          className="bg-background/50 border-white/20 focus:border-primary rounded-xl h-12 text-lg font-medium pr-10"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-white/10">
                        Percentage permanently deducted from each completed session payment for platform maintenance.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                      <div className="space-y-3">
                        <Label htmlFor="minRate" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Min Hourly Rate</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">GH₵</span>
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
                            className="bg-background/50 border-white/20 focus:border-primary rounded-xl h-11 pl-12 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="maxRate" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Max Hourly Rate</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">GH₵</span>
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
                            className="bg-background/50 border-white/20 focus:border-primary rounded-xl h-11 pl-12 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Verification Settings */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg h-full transition-all duration-300 hover:bg-white/50">
                  <CardHeader className="border-b border-border/50 bg-muted/20">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <div className="p-2 rounded-lg bg-red-500/10 ring-1 ring-red-500/30">
                        <ShieldCheck className="w-5 h-5 text-red-500" />
                      </div>
                      Verification & Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    
                    <div className="flex items-start justify-between p-4 rounded-xl bg-background/50 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="space-y-1 pr-6">
                        <Label className="text-base font-semibold cursor-pointer">Require Teacher Verification</Label>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Enforce mandatory ID and certificate verification before any teacher is allowed to accept students and bookings.
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
                        className="data-[state=checked]:bg-primary shadow-sm"
                      />
                    </div>

                    <div className="flex items-start justify-between p-4 rounded-xl bg-background/50 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="space-y-1 pr-6">
                        <Label className="text-base font-semibold cursor-pointer">Auto-Approve Sessions</Label>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Automatically approve all session bookings without requiring manual teacher confirmations. Use with caution.
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
                        className="data-[state=checked]:bg-primary shadow-sm"
                      />
                    </div>

                  </CardContent>
                </Card>
              </motion.div>

            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
