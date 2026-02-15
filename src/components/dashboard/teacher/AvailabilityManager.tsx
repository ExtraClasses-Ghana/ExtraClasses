import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Clock, 
  Save,
  Plus,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

const defaultDayAvailability: DayAvailability = {
  enabled: false,
  slots: [{ start: "09:00", end: "17:00" }]
};

const defaultWeeklyAvailability: WeeklyAvailability = {
  monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  friday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  saturday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
  sunday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
};

const timeOptions = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

const dayLabels: Record<keyof WeeklyAvailability, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

export function AvailabilityManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<WeeklyAvailability>(defaultWeeklyAvailability);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user]);

  const fetchAvailability = async () => {
    try {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("availability")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data?.availability && typeof data.availability === 'object' && Object.keys(data.availability).length > 0) {
        setAvailability(data.availability as unknown as WeeklyAvailability);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ availability: JSON.parse(JSON.stringify(availability)) })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Availability Updated",
        description: "Your availability has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save availability",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: keyof WeeklyAvailability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
  };

  const updateSlot = (
    day: keyof WeeklyAvailability,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, idx) =>
          idx === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const addSlot = (day: keyof WeeklyAvailability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: "09:00", end: "17:00" }]
      }
    }));
  };

  const removeSlot = (day: keyof WeeklyAvailability, slotIndex: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, idx) => idx !== slotIndex)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Availability Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Set your weekly teaching availability
          </p>
        </div>
        <Button onClick={saveAvailability} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {(Object.keys(dayLabels) as Array<keyof WeeklyAvailability>).map((day, dayIndex) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.05 }}
              className={`p-4 rounded-xl border ${
                availability[day].enabled ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={availability[day].enabled}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label className="font-medium text-base">{dayLabels[day]}</Label>
                </div>
                {availability[day].enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addSlot(day)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Slot
                  </Button>
                )}
              </div>

              {availability[day].enabled && (
                <div className="space-y-3 pl-10">
                  {availability[day].slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={slot.start}
                        onValueChange={(value) => updateSlot(day, slotIndex, "start", value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">to</span>
                      <Select
                        value={slot.end}
                        onValueChange={(value) => updateSlot(day, slotIndex, "end", value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availability[day].slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeSlot(day, slotIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
