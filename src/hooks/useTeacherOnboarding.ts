import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherProfile {
  onboarding_completed: boolean;
  verification_status: string;
}

export function useTeacherOnboarding() {
  const { user, role } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role === "teacher") {
      checkOnboardingStatus();
    } else {
      setLoading(false);
    }
  }, [user, role]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select("onboarding_completed, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTeacherProfile(data);
        
        // Show onboarding if not completed
        if (!data.onboarding_completed) {
          setShowOnboarding(true);
        }
        // Show document upload if onboarding completed but not verified
        else if (data.verification_status === "unverified" || data.verification_status === null) {
          setShowDocumentUpload(true);
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setShowDocumentUpload(true);
  };

  const completeDocumentUpload = () => {
    setShowDocumentUpload(false);
  };

  const skipDocumentUpload = () => {
    setShowDocumentUpload(false);
  };

  return {
    showOnboarding,
    showDocumentUpload,
    teacherProfile,
    loading,
    completeOnboarding,
    completeDocumentUpload,
    skipDocumentUpload,
    setShowOnboarding,
    setShowDocumentUpload,
  };
}
