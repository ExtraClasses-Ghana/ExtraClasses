import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isToday, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from "date-fns";
import { X, Calendar as CalendarIcon, Clock, Video, Home, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Check, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    id: string;
    name: string;
    hourlyRate: number;
    image: string;
    online: boolean;
    inPerson: boolean;
    subjects?: string[];
  };
  selectedDate?: Date;
  selectedTime?: string | null;
}

type Step = 1 | 2 | 3 | 4;

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

// Country codes for phone number selection
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA" },
  { code: "+233", country: "Ghana (GH)" },
  { code: "+44", country: "UK" },
  { code: "+92", country: "Pakistan" },
  { code: "+234", country: "Nigeria" },
  { code: "+91", country: "India" },
  { code: "+356", country: "Malta" },
  { code: "+27", country: "South Africa" },
  { code: "+256", country: "Uganda" },
  { code: "+254", country: "Kenya" },
];

const DURATION_OPTIONS = [
  { value: "60", label: "1 Hour", hours: 1 },
  { value: "90", label: "1:30 Hour", hours: 1.5 },
  { value: "120", label: "2 Hours", hours: 2 },
  { value: "150", label: "2:30 Hours", hours: 2.5 },
  { value: "180", label: "3 Hours", hours: 3 },
];

const GROUP_OPTIONS = [
  { value: "1", label: "Single Student" },
  { value: "2", label: "Group of 2" },
  { value: "3", label: "Group of 3" },
  { value: "4", label: "Group of 4" },
  { value: "5", label: "Group of 5" },
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

export function BookingModal({
  isOpen,
  onClose,
  teacher,
  selectedDate: initialDate,
  selectedTime: initialTime,
}: BookingModalProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime || null);
  const [subject, setSubject] = useState<string>(teacher.subjects?.[0] || "");
  const [lessonType, setLessonType] = useState<"online" | "inPerson">("online");
  const [duration, setDuration] = useState<string>("60");
  const [groupSize, setGroupSize] = useState<string>("1");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+233");
  const [studentLocation, setStudentLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Realtime availability state
  const [teacherAvailability, setTeacherAvailability] = useState<WeeklyAvailability | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  // Fetch teacher availability and existing bookings
  const fetchAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("availability")
        .eq("user_id", teacher.id)
        .maybeSingle();

      if (teacherProfile?.availability && typeof teacherProfile.availability === "object") {
        setTeacherAvailability(teacherProfile.availability as unknown as WeeklyAvailability);
      } else {
        setTeacherAvailability(null);
      }
    } catch (error) {
      console.error("Error fetching teacher availability:", error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchBookedSlots = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("sessions")
        .select("start_time")
        .eq("teacher_id", teacher.id)
        .eq("session_date", dateStr)
        .in("status", ["pending", "confirmed", "scheduled"]);

      const booked = new Set<string>();
      sessions?.forEach((s) => {
        if (s.start_time) {
          // Convert start_time (e.g. "09:00" or "09:00:00") to 12-hour format
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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isOpen) return;

    fetchAvailability();

    // Subscribe to teacher_profiles changes for this teacher
    const channel = supabase
      .channel(`booking_availability_${teacher.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_profiles",
          filter: `user_id=eq.${teacher.id}`,
        },
        () => {
          fetchAvailability();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `teacher_id=eq.${teacher.id}`,
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
  }, [isOpen, teacher.id]);

  // Fetch booked slots when date changes and reset selected time if needed
  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
      // Reset time selection when date changes
      setSelectedTime(null);
    }
  }, [selectedDate, teacher.id]);

  // Generate time slots based on teacher's availability for selected date
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!selectedDate || !teacherAvailability) return [];

    const dayOfWeek = getDay(selectedDate);
    const dayName = DAY_NAMES[dayOfWeek];
    const dayAvail = teacherAvailability[dayName];

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
  }, [selectedDate, teacherAvailability, bookedSlots]);

  // Detect user's country code from browser locale (simplified)
  const detectedCountryCode = useMemo(() => {
    if (typeof window !== "undefined") {
      const locale = navigator.language;
      if (locale.includes("en-US") || locale.includes("en-CA")) return "+1";
      if (locale.includes("en-GB")) return "+44";
      if (locale.includes("en-GH")) return "+233";
    }
    return "+233"; // Default to Ghana
  }, []);

  // Initialize country code on mount
  useState(() => {
    setCountryCode(detectedCountryCode);
  });

  // Calculate pricing
  const basePrice = teacher.hourlyRate * (parseInt(duration) / 60);
  const groupMultiplier = basePrice * parseInt(groupSize);
  
  // Apply discount based on group size
  let discountPercent = 0;
  if (parseInt(groupSize) >= 2 && parseInt(groupSize) <= 3) {
    discountPercent = 10;
  } else if (parseInt(groupSize) >= 4 && parseInt(groupSize) <= 5) {
    discountPercent = 20;
  }
  
  const discountAmount = groupMultiplier * (discountPercent / 100);
  const totalPrice = groupMultiplier - discountAmount;
  const platformFee = 5;

  const handleNext = () => {
    if (step < 4) setStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!user || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const sessionDate = format(selectedDate, "yyyy-MM-dd");
      
      // Convert 12-hour time to 24-hour format for database
      const timeParts = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let startTime = selectedTime;
      if (timeParts) {
        let hour = parseInt(timeParts[1], 10);
        const suffix = timeParts[3].toUpperCase();
        if (suffix === "PM" && hour !== 12) hour += 12;
        if (suffix === "AM" && hour === 12) hour = 0;
        startTime = `${hour.toString().padStart(2, "0")}:00`;
      }

      // Create session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          teacher_id: teacher.id,
          student_id: user.id,
          subject: subject,
          session_date: sessionDate,
          start_time: startTime,
          duration_minutes: parseInt(duration),
          session_type: lessonType,
          status: "pending",
          amount: totalPrice + platformFee,
          notes: notes || null,
          platform_fee: platformFee,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create admin notification for new booking
      await supabase.from("admin_notifications").insert({
        type: "new_booking",
        title: "New Session Booking",
        message: `${profile?.full_name || studentName} booked a ${subject} session with teacher (ID: ${teacher.id}) for ${format(selectedDate, "MMM d, yyyy")} at ${selectedTime}. Amount: GH₵${(totalPrice + platformFee).toFixed(2)}`,
        related_user_id: user.id,
      });

      toast({
        title: "Booking Successful",
        description: "Your session has been booked. You'll receive a confirmation soon.",
      });

      setStep(4);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setSubject(teacher.subjects?.[0] || "");
    setLessonType("online");
    setDuration("60");
    setGroupSize("1");
    setStudentName("");
    setStudentEmail("");
    setStudentPhone("");
    setCountryCode(detectedCountryCode);
    setStudentLocation("");
    setNotes("");
    setIsRecurring(false);
    onClose();
  };

  // Disable past dates and days where teacher is unavailable
  const disabledDays = useMemo(() => {
    const matchers: any[] = [{ before: new Date() }];

    if (teacherAvailability) {
      const disabledDaysOfWeek: number[] = [];
      DAY_NAMES.forEach((dayName, idx) => {
        const dayAvail = teacherAvailability[dayName];
        if (!dayAvail || !dayAvail.enabled) {
          disabledDaysOfWeek.push(idx);
        }
      });
      if (disabledDaysOfWeek.length > 0) {
        matchers.push({ dayOfWeek: disabledDaysOfWeek });
      }
    }

    return matchers;
  }, [teacherAvailability]);

  const canProceedStep1 = selectedDate && selectedTime;
  const canProceedStep2 = studentName && studentEmail && studentLocation && studentPhone;

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-display">Book a Session</DialogTitle>
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step >= s
                      ? "bg-secondary text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      "flex-1 h-1 rounded",
                      step > s ? "bg-secondary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Subject, Date, Time & Session Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Subject Selection */}
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium mb-2 block">
                    Select Subject
                  </Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {(teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects : ["General"]).map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar & Time Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Calendar */}
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

                  {/* Time Slots */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      {selectedDate
                        ? `Available on ${format(selectedDate, "MMM d")}`
                        : "Select a date first"}
                    </Label>
                    {!selectedDate ? (
                      <div className="flex items-center justify-center h-[280px] bg-muted/50 rounded-xl">
                        <p className="text-muted-foreground text-sm">Pick a date from the calendar</p>
                      </div>
                    ) : loadingAvailability ? (
                      <div className="flex items-center justify-center h-[280px] bg-muted/50 rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="flex items-center justify-center h-[280px] bg-muted/50 rounded-xl">
                        <p className="text-muted-foreground text-sm text-center px-4">
                          Teacher is not available on this day.<br />Please select another date.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto p-1">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={cn(
                              "relative px-2 py-2 rounded-lg text-sm font-medium transition-all",
                              slot.available
                                ? selectedTime === slot.time
                                  ? "bg-secondary text-white shadow-md"
                                  : "bg-muted hover:bg-accent/20 text-foreground hover:text-accent"
                                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through"
                            )}
                          >
                            {slot.time}
                            {selectedTime === slot.time && (
                              <Check className="w-3 h-3 absolute top-1 right-1" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Summary */}
                {selectedDate && selectedTime && (
                  <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      {format(selectedDate, "EEE, MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      {selectedTime}
                    </div>
                  </div>
                )}

                {/* Lesson Type */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Lesson Type</Label>
                  <RadioGroup
                    value={lessonType}
                    onValueChange={(val) => setLessonType(val as "online" | "inPerson")}
                    className="grid grid-cols-2 gap-3"
                  >
                    {teacher.online && (
                      <Label
                        htmlFor="online"
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                          lessonType === "online"
                            ? "border-secondary bg-secondary/5"
                            : "border-border hover:border-secondary/50"
                        )}
                      >
                        <RadioGroupItem value="online" id="online" />
                        <Video className="w-5 h-5 text-accent" />
                        <span>Online</span>
                      </Label>
                    )}
                    {teacher.inPerson && (
                      <Label
                        htmlFor="inPerson"
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                          lessonType === "inPerson"
                            ? "border-secondary bg-secondary/5"
                            : "border-border hover:border-secondary/50"
                        )}
                      >
                        <RadioGroupItem value="inPerson" id="inPerson" />
                        <Home className="w-5 h-5 text-gold" />
                        <span>In-Person</span>
                      </Label>
                    )}
                  </RadioGroup>
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Session Duration</Label>
                  <RadioGroup
                    value={duration}
                    onValueChange={setDuration}
                    className="grid grid-cols-3 gap-2 lg:grid-cols-5"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <Label
                        key={opt.value}
                        htmlFor={`duration-${opt.value}`}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center",
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
                        <span className="text-xs text-muted-foreground">
                          GH₵{(teacher.hourlyRate * opt.hours).toFixed(2)}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Group Booking */}
                <div>
                  <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Student Group Category
                  </Label>
                  <RadioGroup
                    value={groupSize}
                    onValueChange={setGroupSize}
                    className="grid grid-cols-2 md:grid-cols-3 gap-3"
                  >
                    {GROUP_OPTIONS.map((opt) => (
                      <Label
                        key={opt.value}
                        htmlFor={`group-${opt.value}`}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                          groupSize === opt.value
                            ? "border-secondary bg-secondary/5"
                            : "border-border hover:border-secondary/50"
                        )}
                      >
                        <RadioGroupItem
                          value={opt.value}
                          id={`group-${opt.value}`}
                          className="sr-only"
                        />
                        <span className="font-medium text-sm">{opt.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            )}

            {/* Step 2: Student Details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="studentName" className="text-sm font-medium mb-2 block">
                    Student Name *
                  </Label>
                  <Input
                    id="studentName"
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="studentEmail" className="text-sm font-medium mb-2 block">
                    Email Address *
                  </Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="studentLocation" className="text-sm font-medium mb-2 block">
                    Student Location (Address) *
                  </Label>
                  <Input
                    id="studentLocation"
                    placeholder="Enter your street address or location"
                    value={studentLocation}
                    onChange={(e) => setStudentLocation(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((cc) => (
                          <SelectItem key={cc.code} value={cc.code}>
                            {cc.code} {cc.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="studentPhone"
                      type="tel"
                      placeholder="246 123 4567"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, ""))}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full number: {countryCode}{studentPhone}
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                    Notes for Teacher (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific topics or requirements..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Review & Pay */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Booking Summary */}
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.image}
                      alt={teacher.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lessonType === "online" ? "Online Lesson" : "In-Person Lesson"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject</span>
                      <span>{subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Not selected"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span>{selectedTime || "Not selected"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>
                        {DURATION_OPTIONS.find((d) => d.value === duration)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Group Size</span>
                      <span>
                        {GROUP_OPTIONS.find((g) => g.value === groupSize)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student</span>
                      <span>{studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span>{studentLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 rounded-xl border border-border space-y-3">
                  <h3 className="font-semibold text-sm">Price Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Base Price (GH₵{teacher.hourlyRate}/hour × {DURATION_OPTIONS.find((d) => d.value === duration)?.hours} hour(s))
                      </span>
                      <span>GH₵{basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Group Multiplier (×{groupSize} students)
                      </span>
                      <span>GH₵{groupMultiplier.toFixed(2)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-accent font-medium">
                        <span>Discount ({discountPercent}%)</span>
                        <span>-GH₵{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="text-muted-foreground">Session Fee</span>
                      <span className="font-semibold">GH₵{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>GH₵{platformFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-secondary text-lg">GH₵{(totalPrice + platformFee).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Note */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure payment via Mobile Money or Card</span>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">
                  Booking Confirmed!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your session with {teacher.name} has been booked. You'll receive a confirmation email shortly.
                </p>
                <Button onClick={resetAndClose} className="btn-coral">
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={step === 3 ? handleSubmit : handleNext}
                className="btn-coral flex-1"
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && isSubmitting)
                }
              >
                {step === 3 ? (isSubmitting ? "Processing..." : "Confirm Booking") : "Continue"}
                {step < 3 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
