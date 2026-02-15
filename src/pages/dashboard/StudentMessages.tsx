import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { MessagingCenter } from "@/components/dashboard/student/MessagingCenter";

export default function StudentMessages() {
  return (
    <StudentDashboardLayout>
      <MessagingCenter />
    </StudentDashboardLayout>
  );
}
