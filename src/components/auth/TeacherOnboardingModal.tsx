import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Languages, 
  DollarSign,
  MapPin,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SUBJECTS = [
  "Mathematics", "English", "Science", "Physics", "Chemistry", 
  "Biology", "History", "Geography", "Economics", "French",
  "ICT", "Social Studies", "Literature", "Art", "Music"
];

const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Hausa", "French"];

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North"
];

const STEPS = [
  { id: 1, title: "About You", icon: GraduationCap },
  { id: 2, title: "Experience", icon: Briefcase },
  { id: 3, title: "Subjects", icon: BookOpen },
  { id: 4, title: "Languages & Location", icon: Languages },
  { id: 5, title: "Achievements & Rates", icon: DollarSign },
];

export function TeacherOnboardingModal({ isOpen, onClose, onComplete }: TeacherOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [newQualification, setNewQualification] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [teachingMode, setTeachingMode] = useState<"online" | "in-person" | "both">("both");
  const [hourlyRate, setHourlyRate] = useState("");
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAchievement, setNewAchievement] = useState("");

  const addQualification = () => {
    if (newQualification.trim() && !qualifications.includes(newQualification.trim())) {
      setQualifications([...qualifications, newQualification.trim()]);
      setNewQualification("");
    }
  };

  const removeQualification = (qual: string) => {
    setQualifications(qualifications.filter(q => q !== qual));
  };

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== language));
    } else {
      setSelectedLanguages([...selectedLanguages, language]);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update teacher profile
      const { error: profileError } = await supabase
        .from("teacher_profiles")
        .update({
          bio,
          experience_years: parseInt(experienceYears) || 0,
          qualifications,
          subjects: selectedSubjects,
          languages: selectedLanguages,
          teaching_mode: teachingMode,
          hourly_rate: parseFloat(hourlyRate) || 0,
          onboarding_completed: true,
          achievements,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update profile region
      const { error: regionError } = await supabase
        .from("profiles")
        .update({ region: selectedRegion })
        .eq("user_id", user.id);

      if (regionError) throw regionError;

      toast({
        title: "Profile completed!",
        description: "Your teacher profile is now set up. Next, upload your verification documents.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return bio.length >= 50;
      case 2:
        return experienceYears !== "" && qualifications.length > 0;
      case 3:
        return selectedSubjects.length > 0;
      case 4:
        return selectedLanguages.length > 0 && selectedRegion !== "";
      case 5:
        return hourlyRate !== "" && parseFloat(hourlyRate) > 0;
      default:
        return true;
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
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary to-accent p-6 text-white relative">
            <button
              onClick={onClose}
              title="Close"
              aria-label="Close onboarding modal"
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-display font-bold">Complete Your Teacher Profile</h2>
            <p className="text-white/80 mt-1">
              Tell us about yourself so students can find you
            </p>
          </div>

          {/* Step Progress */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    currentStep >= step.id
                      ? "bg-secondary border-secondary text-secondary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.id ? "bg-secondary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Step {currentStep} of 5: {STEPS[currentStep - 1].title}
            </p>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Step 1: About You */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bio">Tell students about yourself *</Label>
                      <Textarea
                        id="bio"
                        placeholder="Share your teaching philosophy, background, and what makes you a great tutor. Students love to know who they'll be learning from!"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />
                      <p className="text-sm text-muted-foreground">
                        {bio.length}/50 characters minimum ({bio.length < 50 ? `${50 - bio.length} more needed` : "✓"})
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Experience */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Teaching Experience *</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        placeholder="e.g., 5"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Qualifications & Certifications *</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., B.Ed Mathematics, PGCE"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addQualification())}
                        />
                        <Button type="button" onClick={addQualification} variant="secondary">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {qualifications.map((qual) => (
                          <Badge key={qual} variant="secondary" className="px-3 py-1">
                            {qual}
                            <button
                              type="button"
                              onClick={() => removeQualification(qual)}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Subjects */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <Label>Select the subjects you teach *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {SUBJECTS.map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedSubjects.includes(subject)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedSubjects.length} subject(s)
                    </p>
                  </div>
                )}

                {/* Step 4: Languages & Location */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Languages you can teach in *</Label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map((language) => (
                          <button
                            key={language}
                            type="button"
                            onClick={() => toggleLanguage(language)}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              selectedLanguages.includes(language)
                                ? "border-secondary bg-secondary/10 text-secondary"
                                : "border-border hover:border-secondary/50"
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">Your Region *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                          id="region"
                          title="Your Region"
                          aria-label="Your Region"
                          value={selectedRegion}
                          onChange={(e) => setSelectedRegion(e.target.value)}
                          className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select your region</option>
                          {REGIONS.map((region) => (
                            <option key={region} value={region}>
                              {region}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Teaching Mode</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "online", label: "Online Only" },
                          { value: "in-person", label: "In-Person Only" },
                          { value: "both", label: "Both" },
                        ].map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => setTeachingMode(mode.value as typeof teachingMode)}
                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                              teachingMode === mode.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Achievements & Rates */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    {/* Achievements */}
                    <div className="space-y-2">
                      <Label>Achievements & Awards</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Best Teacher Award 2023, Published Author"
                          value={newAchievement}
                          onChange={(e) => setNewAchievement(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newAchievement.trim() && !achievements.includes(newAchievement.trim())) {
                                setAchievements([...achievements, newAchievement.trim()]);
                                setNewAchievement("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newAchievement.trim() && !achievements.includes(newAchievement.trim())) {
                              setAchievements([...achievements, newAchievement.trim()]);
                              setNewAchievement("");
                            }
                          }}
                          variant="secondary"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {achievements.map((ach) => (
                          <Badge key={ach} variant="secondary" className="px-3 py-1">
                            {ach}
                            <button
                              type="button"
                              onClick={() => setAchievements(achievements.filter(a => a !== ach))}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">Optional: Add any teaching awards or achievements</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (GH₵) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="hourlyRate"
                          type="number"
                          min="0"
                          step="5"
                          placeholder="e.g., 50"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The average rate for tutors in Ghana is GH₵30-80 per hour
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 mt-4">
                      <h4 className="font-medium mb-2">Profile Summary</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>✓ {experienceYears} years experience</li>
                        <li>✓ {qualifications.length} qualification(s)</li>
                        <li>✓ {selectedSubjects.length} subject(s)</li>
                        <li>✓ {selectedLanguages.join(", ")}</li>
                        <li>✓ {selectedRegion}</li>
                        {achievements.length > 0 && <li>✓ {achievements.length} achievement(s)</li>}
                        <li>✓ GH₵{hourlyRate}/hour</li>
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-6 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="btn-coral"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className="btn-coral"
              >
                {isLoading ? "Saving..." : "Complete Profile"}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
