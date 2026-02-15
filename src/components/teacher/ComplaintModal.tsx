import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}

const complaintTypes = [
  { value: "unprofessional", label: "Unprofessional Behavior" },
  { value: "no_show", label: "No-Show / Missed Session" },
  { value: "poor_quality", label: "Poor Quality Teaching" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "harassment", label: "Harassment" },
  { value: "fraud", label: "Fraud / Scam" },
  { value: "other", label: "Other" },
];

export function ComplaintModal({ isOpen, onClose, teacherId, teacherName }: ComplaintModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaintType, setComplaintType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to submit a complaint",
        variant: "destructive",
      });
      return;
    }

    if (!complaintType || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a complaint type and provide details",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("complaints").insert({
        reporter_id: user.id,
        reported_user_id: teacherId,
        complaint_type: complaintType,
        description: description.trim(),
      });

      if (error) throw error;

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        type: "complaint",
        title: "New Complaint Filed",
        message: `A complaint has been filed against ${teacherName}`,
        related_user_id: teacherId,
      });

      toast({
        title: "Complaint submitted",
        description: "Your complaint has been sent to our admin team for review",
      });

      setComplaintType("");
      setDescription("");
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit complaint",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-destructive/90 to-destructive p-6 text-white relative">
            <button
              onClick={onClose}
              title="Close dialog"
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Report Teacher</h2>
                <p className="text-white/80 text-sm">Submit a complaint about {teacherName}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Please only submit genuine complaints. False reports may result in account suspension.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Complaint Type *</Label>
              <Select value={complaintType} onValueChange={setComplaintType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select complaint type" />
                </SelectTrigger>
                <SelectContent>
                  {complaintTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about your complaint..."
                rows={4}
                required
                minLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 20 characters. Be specific about what happened.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={isSubmitting || !complaintType || description.length < 20}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Submit Complaint
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
