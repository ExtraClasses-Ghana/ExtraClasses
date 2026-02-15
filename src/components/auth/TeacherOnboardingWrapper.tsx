import { useEffect } from "react";
import { TeacherOnboardingModal } from "@/components/auth/TeacherOnboardingModal";
import { DocumentUploadModal } from "@/components/auth/DocumentUploadModal";
import { useTeacherOnboarding } from "@/hooks/useTeacherOnboarding";

interface TeacherOnboardingWrapperProps {
  children: React.ReactNode;
}

export function TeacherOnboardingWrapper({ children }: TeacherOnboardingWrapperProps) {
  const {
    showOnboarding,
    showDocumentUpload,
    loading,
    completeOnboarding,
    completeDocumentUpload,
    skipDocumentUpload,
    setShowOnboarding,
    setShowDocumentUpload,
  } = useTeacherOnboarding();

  if (loading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <TeacherOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={completeOnboarding}
      />
      
      <DocumentUploadModal
        isOpen={showDocumentUpload}
        onClose={skipDocumentUpload}
        onComplete={completeDocumentUpload}
      />
    </>
  );
}
