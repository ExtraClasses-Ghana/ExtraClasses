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
  Check,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjectsByEducationLevel } from "@/hooks/useSubjectsByEducationLevel";

interface TeacherOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

import { useEducationLevels, useEducationSubCategories } from "@/hooks/useEducationLevel";

const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Hausa", "French"];

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North"
];

const STEPS = [
  { id: 1, title: "Education Category", icon: GraduationCap },
  { id: 2, title: "About You", icon: GraduationCap },
  { id: 3, title: "Experience", icon: Briefcase },
  { id: 4, title: "Subjects", icon: BookOpen },
  { id: 5, title: "Languages & Location", icon: Languages },
  { id: 6, title: "Achievements & Rates", icon: DollarSign },
];

export function TeacherOnboardingModal({ isOpen, onClose, onComplete }: TeacherOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form State - Education
  const { levels: educationLevels, loading: loadingLevels } = useEducationLevels();
  const { categories: subCategories, loading: loadingSubCategories } = useEducationSubCategories();
  const [educationLevel, setEducationLevel] = useState("");
  const [educationCategory, setEducationCategory] = useState("");
  const { subjects } = useSubjectsByEducationLevel(educationCategory || null);
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
    if (currentStep < 6) {
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
          education_level: educationLevel,
          education_sub_category: null,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update profile region and education category
      const { error: regionError } = await supabase
        .from("profiles")
        .update({ 
          region: selectedRegion,
          education_level: educationLevel,
          education_sub_category: null,
        })
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
        return !!educationLevel;
      case 2:
        return bio.length >= 50;
      case 3:
        return experienceYears !== "" && qualifications.length > 0;
      case 4:
        return selectedSubjects.length > 0;
      case 5:
        return selectedLanguages.length > 0 && selectedRegion !== "";
      case 6:
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
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-card/95 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20 dark:border-white/10 relative"
        >
          {/* Decorative background glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-8 text-white relative flex-shrink-0">
            <button
              onClick={onClose}
              title="Close"
              aria-label="Close onboarding modal"
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-black tracking-tight">Teacher Profile setup</h2>
                <p className="text-white/80 mt-1 font-medium text-sm md:text-base">
                  Tell us about yourself so students can find you
                </p>
              </div>
            </div>
          </div>

          {/* Step Progress */}
          <div className="px-8 py-5 border-b border-border/50 bg-slate-50/50 dark:bg-black/20 flex-shrink-0 z-10 relative backdrop-blur-xl">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex flex-col items-center relative group`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-sm ${
                      currentStep > step.id
                        ? "bg-primary border-primary text-white shadow-primary/30"
                        : currentStep === step.id
                        ? "bg-white border-2 border-primary text-primary shadow-md dark:bg-card relative"
                        : "bg-slate-100 border border-slate-200 text-slate-400 dark:bg-black/40 dark:border-white/10"
                    }`}>
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5 animate-in zoom-in duration-300" />
                      ) : (
                        <step.icon className={`w-5 h-5 ${currentStep === step.id ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {step.title}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="w-6 sm:w-16 h-1 mx-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div className={`h-full bg-primary transition-all duration-500 rounded-full ${currentStep > step.id ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-center mt-5 text-primary tracking-wide uppercase">
              Step {currentStep} of 6: <span className="text-foreground">{STEPS[currentStep - 1].title}</span>
            </p>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Step 1: Education Level */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-lg font-bold text-foreground">Select your education category</Label>
                      <p className="text-sm text-muted-foreground mb-4">Choose the primary education level you focus on teaching.</p>
                      {loadingLevels ? (
                        <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent flex animate-spin rounded-full" /></div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {educationLevels.map((level) => (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => {
                                setEducationLevel(level.name);
                                setEducationCategory(level.name);
                                setSelectedSubjects([]);
                              }}
                              className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all duration-300 transform hover:-translate-y-1 ${
                                educationLevel === level.name
                                  ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10"
                                  : "border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {level.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: About You */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="bio" className="text-lg font-bold">Tell students about yourself</Label>
                      <p className="text-sm text-muted-foreground mb-4">Share your teaching philosophy, background, and what makes you a great tutor.</p>
                      <Textarea
                        id="bio"
                        placeholder="Hello! I'm an experienced tutor who loves making complex topics easy to understand..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={8}
                        className="resize-none rounded-2xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 focus-visible:ring-primary focus-visible:border-primary text-base p-4"
                      />
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className={`${bio.length < 50 ? 'text-amber-500' : 'text-emerald-500 flex items-center gap-1'} transition-colors`}>
                          {bio.length < 50 ? `${50 - bio.length} more characters needed` : <><Check className="w-4 h-4"/> Perfect length</>}
                        </span>
                        <span className="text-muted-foreground px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md">{bio.length} chars</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Experience */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="experience" className="text-base font-bold">Years of Teaching Experience</Label>
                      <div className="relative max-w-sm">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          placeholder="e.g., 5"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                          className="pl-12 h-14 rounded-2xl text-lg bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <Label className="text-base font-bold">Qualifications & Certifications</Label>
                      <p className="text-sm text-muted-foreground mb-2">Add degrees, teaching certificates, or professional courses you've completed.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., B.Ed Mathematics, PGCE"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addQualification())}
                          className="h-12 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10"
                        />
                        <Button type="button" onClick={addQualification} className="h-12 px-6 rounded-xl bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-black">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl min-h-[80px] border border-slate-100 dark:border-white/5">
                        {qualifications.length === 0 && <span className="text-muted-foreground text-sm m-auto">No qualifications added yet</span>}
                        {qualifications.map((qual) => (
                          <Badge key={qual} variant="secondary" className="px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-black shadow-sm border border-slate-200 dark:border-white/10 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-primary" /> {qual}
                            <button
                              type="button"
                              onClick={() => removeQualification(qual)}
                              className="ml-1 p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Subjects */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-lg font-bold">Select the subjects you teach</Label>
                      <p className="text-sm text-muted-foreground mb-4">You can select multiple subjects based on your expertise.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {subjects.length === 0 ? (
                           <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/20">
                             <p className="text-muted-foreground font-medium">No subjects found for {educationCategory}.</p>
                           </div>
                        ) : subjects.map((subject) => (
                          <button
                              key={subject.id}
                              type="button"
                              onClick={() => toggleSubject(subject.name)}
                              className={`p-4 rounded-2xl border-2 text-sm font-bold text-left transition-all duration-200 flex items-center justify-between ${
                                selectedSubjects.includes(subject.name)
                                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span className="truncate pr-2">{subject.name}</span>
                              {selectedSubjects.includes(subject.name) && <Check className="w-4 h-4 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-sm font-medium">
                        <BookOpen className="w-4 h-4 text-primary" /> Selected: {selectedSubjects.length} subject(s)
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Languages & Location */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-bold">Languages you can teach in</Label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map((language) => (
                          <button
                            key={language}
                            type="button"
                            onClick={() => toggleLanguage(language)}
                            className={`px-5 py-2.5 rounded-full border-2 text-sm font-bold transition-all duration-200 shadow-sm ${
                              selectedLanguages.includes(language)
                                ? "border-primary bg-primary text-white"
                                : "border-slate-200 dark:border-white/10 hover:border-primary/30 text-slate-600 dark:text-slate-300 bg-white dark:bg-black/20"
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-border/50">
                      <Label htmlFor="region" className="text-base font-bold">Your Primary Region</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                        <select
                          id="region"
                          title="Your Region"
                          aria-label="Your Region"
                          value={selectedRegion}
                          onChange={(e) => setSelectedRegion(e.target.value)}
                          className="w-full pl-12 h-14 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-base font-medium focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                        >
                          <option value="">Select your region</option>
                          {REGIONS.map((region) => (
                            <option key={region} value={region}>
                              {region}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-border/50">
                      <Label className="text-base font-bold">Teaching Mode Preference</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { value: "online", label: "Online Only", icon: "🌐" },
                          { value: "in-person", label: "In-Person Only", icon: "👥" },
                          { value: "both", label: "Both Options", icon: "✨" },
                        ].map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => setTeachingMode(mode.value as typeof teachingMode)}
                            className={`p-4 rounded-2xl border-2 text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                              teachingMode === mode.value
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="text-2xl mb-1">{mode.icon}</span>
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Achievements & Rates */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    {/* Achievements */}
                    <div className="space-y-3">
                      <Label className="text-base font-bold">Achievements & Awards</Label>
                      <p className="text-sm text-muted-foreground mb-2">Optional: Add any teaching awards or achievements to boost your profile.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Best Teacher Award 2023"
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
                          className="h-12 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newAchievement.trim() && !achievements.includes(newAchievement.trim())) {
                              setAchievements([...achievements, newAchievement.trim()]);
                              setNewAchievement("");
                            }
                          }}
                          className="h-12 px-6 rounded-xl bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-black"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl min-h-[80px] border border-slate-100 dark:border-white/5">
                        {achievements.length === 0 && <span className="text-muted-foreground text-sm m-auto">No achievements added</span>}
                        {achievements.map((ach) => (
                          <Badge key={ach} variant="secondary" className="px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-black shadow-sm border border-slate-200 dark:border-white/10 flex items-center gap-2">
                            <span className="text-amber-500">🏆</span> {ach}
                            <button
                              type="button"
                              onClick={() => setAchievements(achievements.filter(a => a !== ach))}
                              className="ml-1 p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-border/50">
                      <Label htmlFor="hourlyRate" className="text-base font-bold">Your Requested Hourly Rate (GH₵)</Label>
                      <div className="relative max-w-sm">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                        <Input
                          id="hourlyRate"
                          type="number"
                          min="0"
                          step="5"
                          placeholder="e.g., 50"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="pl-12 h-14 rounded-2xl text-xl font-bold bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 focus-visible:ring-emerald-500"
                        />
                      </div>
                      <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">
                        The average competitive rate for tutors in Ghana is GH₵30-80 per hour.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mt-8 border border-primary/20">
                      <h4 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
                        <Check className="w-5 h-5 bg-primary text-white rounded-full p-1" /> Profile Summary Ready
                      </h4>
                      <ul className="text-sm font-medium text-slate-700 dark:text-slate-300 space-y-2.5 grid grid-cols-1 sm:grid-cols-2">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> {experienceYears} years experience</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> {qualifications.length} qualification(s)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> {selectedSubjects.length} subject(s)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> {selectedLanguages.length} language(s)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> {selectedRegion}</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> GH₵{hourlyRate || '0'}/hour</li>
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 p-6 md:px-8 md:py-6 bg-slate-50/50 dark:bg-black/20 flex justify-between items-center z-10 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="h-12 px-6 rounded-xl border-2 font-bold hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>

            {currentStep < 6 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 border-0"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Complete Profile
                  </div>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
