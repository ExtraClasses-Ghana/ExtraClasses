import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Clock, Check } from "lucide-react";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailabilityCalendarProps {
  onSelectSlot: (date: Date | undefined, time: string) => void;
  selectedDate: Date | undefined;
  selectedTime: string | null;
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

export function AvailabilityCalendar({ 
  onSelectSlot, 
  selectedDate, 
  selectedTime 
}: AvailabilityCalendarProps) {
  const handleDateSelect = (date: Date | undefined) => {
    onSelectSlot(date, selectedTime || "");
  };

  const handleTimeSelect = (time: string) => {
    onSelectSlot(selectedDate, time);
  };

  // Disable past dates
  const disabledDays = { before: new Date() };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-display font-bold text-foreground">Availability</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            className={cn("p-3 pointer-events-auto rounded-xl border border-border")}
          />
        </div>

        {/* Time Slots */}
        <div>
          <h3 className="font-medium text-foreground mb-3">
            {selectedDate 
              ? `Available times on ${selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
              : "Select a date to see available times"
            }
          </h3>
          
          {selectedDate && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => slot.available && handleTimeSelect(slot.time)}
                  className={cn(
                    "relative px-3 py-2 rounded-lg text-sm font-medium transition-all",
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

          {!selectedDate && (
            <div className="flex items-center justify-center h-32 bg-muted/50 rounded-xl">
              <p className="text-muted-foreground text-sm">Pick a date from the calendar</p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted/50" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-secondary" />
              <span>Selected</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
