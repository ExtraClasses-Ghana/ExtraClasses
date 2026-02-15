import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Calendar as CalendarIcon, Clock, Video, Home, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    name: string;
    hourlyRate: number;
    image: string;
    online: boolean;
    inPerson: boolean;
  };
  selectedDate?: Date;
  selectedTime?: string | null;
}

type Step = 1 | 2 | 3 | 4;

interface TimeSlot {
  time: string;
  available: boolean;
}

const timeSlots: TimeSlot[] = [
  { time: "08:00 AM", available: true },
  { time: "09:00 AM", available: true },
  { time: "10:00 AM", available: false },
  { time: "11:00 AM", available: true },
  { time: "12:00 PM", available: false },
  { time: "01:00 PM", available: true },
  { time: "02:00 PM", available: true },
  { time: "03:00 PM", available: true },
  { time: "04:00 PM", available: false },
  { time: "05:00 PM", available: true },
  { time: "06:00 PM", available: true },
  { time: "07:00 PM", available: true },
];

export function BookingModal({ 
  isOpen, 
  onClose, 
  teacher, 
  selectedDate: initialDate, 
  selectedTime: initialTime 
}: BookingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime || null);
  const [lessonType, setLessonType] = useState<"online" | "inPerson">("online");
  const [duration, setDuration] = useState<"60" | "90" | "120">("60");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const totalPrice = teacher.hourlyRate * (parseInt(duration) / 60);

  const handleNext = () => {
    if (step < 4) setStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  };

  const handleSubmit = () => {
    // Handle booking submission
    console.log("Booking submitted:", {
      lessonType,
      duration,
      studentName,
      studentEmail,
      notes,
      isRecurring,
      selectedDate,
      selectedTime,
    });
    setStep(4);
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setLessonType("online");
    setDuration("60");
    setStudentName("");
    setStudentEmail("");
    setNotes("");
    setIsRecurring(false);
    onClose();
  };

  // Disable past dates
  const disabledDays = { before: new Date() };

  const canProceedStep1 = selectedDate && selectedTime;

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
            {/* Step 1: Select Date, Time & Session Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
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
                        : "Select a date first"
                      }
                    </Label>
                    {selectedDate ? (
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
                    ) : (
                      <div className="flex items-center justify-center h-[280px] bg-muted/50 rounded-xl">
                        <p className="text-muted-foreground text-sm">Pick a date from the calendar</p>
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
                    onValueChange={(val) => setDuration(val as "60" | "90" | "120")}
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { value: "60", label: "1 hour" },
                      { value: "90", label: "1.5 hours" },
                      { value: "120", label: "2 hours" },
                    ].map((opt) => (
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
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-sm text-muted-foreground">
                          GH₵{teacher.hourlyRate * (parseInt(opt.value) / 60)}
                        </span>
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
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="studentEmail">Email Address</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes for Teacher (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific topics or requirements..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1.5 min-h-[100px]"
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
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span>{selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Not selected"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span>{selectedTime || "Not selected"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{parseInt(duration) / 60} hour(s)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Student</span>
                      <span>{studentName}</span>
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Session Fee</span>
                    <span>GH₵{totalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span>GH₵5</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-secondary text-lg">GH₵{totalPrice + 5}</span>
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
                  (step === 2 && (!studentName || !studentEmail))
                }
              >
                {step === 3 ? "Confirm Booking" : "Continue"}
                {step < 3 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
