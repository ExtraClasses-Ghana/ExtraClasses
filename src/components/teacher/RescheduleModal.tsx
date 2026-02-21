import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, getDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RescheduleModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DayAvailability {
  enabled: boolean;
  slots: { start: string; end: string }[];
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

const DAY_NAMES: (keyof WeeklyAvailability)[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
];

const DURATION_OPTIONS = [
  { value: "60", label: "1 Hour" },
  { value: "90", label: "1:30 Hour" },
  { value: "120", label: "2 Hours" },
  { value: "150", label: "2:30 Hours" },
  { value: "180", label: "3 Hours" },
];

function formatHourTo12(hour24: string): string {
  const [h] = hour24.split(":");
  const hourNum = parseInt(h, 10);
  const suffix = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${hour12.toString().padStart(2, "0")}:00 ${suffix}`;
}

function generateHourlySlots(start: string, end: string): string[] {
  const startHour = parseInt(start.split(":")[0], 10);
  const endHour = parseInt(end.split(":")[0], 10);
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(formatHourTo12(`${h.toString().padStart(2, "0")}:00`));
  }
  return slots;
}

export function RescheduleModal({
  studentId,
  studentName,
  isOpen,
  onClose,
}: RescheduleModalProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<{ hourly_rate: number; availability: WeeklyAvailability | null } | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const fetchTeacherInfo = async () => {
    if (!user?.id) return;
    setLoadingAvailability(true);
    try {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("hourly_rate, availability")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setTeacherInfo({
          hourly_rate: data.hourly_rate || 50,
          availability: data.availability as unknown as WeeklyAvailability | null,
        });
      }
    } catch (error) {
      console.error("Error fetching teacher info:", error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchBookedSlots = async (date: Date) => {
    if (!user?.id) return;
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("sessions")
        .select("start_time")
        .eq("teacher_id", user.id)
        .eq("session_date", dateStr)
        .in("status", ["pending", "confirmed", "scheduled"]);

      const booked = new Set<string>();
      sessions?.forEach((s) => {
        if (s.start_time) {
          const timeParts = s.start_time.split(":");
          const hour = parseInt(timeParts[0], 10);
          const formattedTime = formatHourTo12(`${hour.toString().padStart(2, "0")}:00`);
          booked.add(formattedTime);
        }
      });
      setBookedSlots(booked);
    } catch (error) {
      console.error("Error fetching booked slots:", error);
    }
  };

  useEffect(() => {
    if (!user?.id || !isOpen) return;

    fetchTeacherInfo();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`reschedule_availability_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTeacherInfo();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `teacher_id=eq.${user.id}`,
        },
        () => {
          if (selectedDate) {
            fetchBookedSlots(selectedDate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isOpen]);

  useEffect(() => {
    if (selectedDate && user?.id) {
      fetchBookedSlots(selectedDate);
      setSelectedTime(null);
    }
  }, [selectedDate, user?.id]);

  // Generate time slots based on teacher's availability for selected date
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!selectedDate || !teacherInfo?.availability) return [];

    const dayOfWeek = getDay(selectedDate);
    const dayName = DAY_NAMES[dayOfWeek];
    const dayAvail = teacherInfo.availability[dayName];

    if (!dayAvail || !dayAvail.enabled) return [];

    const allSlots: TimeSlot[] = [];
    dayAvail.slots.forEach((slot) => {
      const hourlySlots = generateHourlySlots(slot.start, slot.end);
      hourlySlots.forEach((time) => {
        const isBooked = bookedSlots.has(time);
        allSlots.push({ time, available: !isBooked });
      });
    });

    return allSlots;
  }, [selectedDate, teacherInfo?.availability, bookedSlots]);

  // Disable days where teacher is unavailable
  const disabledDays = useMemo(() => {
    const matchers: any[] = [{ before: new Date() }];

    if (teacherInfo?.availability) {
      const disabledDaysOfWeek: number[] = [];
      DAY_NAMES.forEach((dayName, idx) => {
        const dayAvail = teacherInfo.availability![dayName];
        if (!dayAvail || !dayAvail.enabled) {
          disabledDaysOfWeek.push(idx);
        }
      });
      if (disabledDaysOfWeek.length > 0) {
        matchers.push({ dayOfWeek: disabledDaysOfWeek });
      }
    }

    return matchers;
  }, [teacherInfo?.availability]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast.error("Please select date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const sessionDate = format(selectedDate, "yyyy-MM-dd");
      const amount = (teacherInfo?.hourly_rate || 50) * (parseInt(duration) / 60);

      const { error } = await supabase.from("sessions").insert({
        teacher_id: user.id,
        student_id: studentId,
        subject: "To be determined",
        session_date: sessionDate,
        start_time: selectedTime,
        duration_minutes: parseInt(duration),
        session_type: "online",
        status: "pending",
        amount: amount,
      });

      if (error) throw error;

      toast.success(`Session rescheduled with ${studentName} for ${format(selectedDate, "MMM d, yyyy")} at ${selectedTime}`);
      onClose();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to reschedule session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedDate && selectedTime;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Reschedule Session with {studentName}</DialogTitle>
          <DialogDescription>
            Select a new date and time for the next lesson
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Date</Label>
            <div className="flex justify-center border rounded-xl p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                className="pointer-events-auto"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {selectedDate
                ? `Select Time for ${format(selectedDate, "MMM d")}`
                : "Select a date first"}
            </Label>
            {!selectedDate ? (
              <div className="flex items-center justify-center h-24 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Pick a date from the calendar</p>
              </div>
            ) : loadingAvailability ? (
              <div className="flex items-center justify-center h-24 bg-muted/50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="flex items-center justify-center h-24 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground text-center px-4">
                  No availability set for this day.<br />Please select another date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium transition-all",
                      slot.available
                        ? selectedTime === slot.time
                          ? "bg-secondary text-white"
                          : "bg-muted hover:bg-accent/20"
                        : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Duration</Label>
            <RadioGroup value={duration} onValueChange={setDuration}>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`duration-${opt.value}`}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-all",
                      duration === opt.value
                        ? "border-secondary bg-secondary/5"
                        : "border-border hover:border-secondary/50"
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`duration-${opt.value}`}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          {selectedDate && selectedTime && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-muted/50 space-y-2"
            >
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {format(selectedDate, "EEE, MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {selectedTime}
                </div>
              </div>
              {teacherInfo && (
                <div className="text-xs text-muted-foreground">
                  Est. Amount: GH₵{(teacherInfo.hourly_rate * (parseInt(duration) / 60)).toFixed(2)}
                </div>
              )}
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Session"}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
