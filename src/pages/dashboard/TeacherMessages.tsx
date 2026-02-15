import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { MessagingCenter } from "@/components/dashboard/student/MessagingCenter";

export default function TeacherMessages() {
  return (
    <TeacherDashboardLayout>
      <MessagingCenter />
    </TeacherDashboardLayout>
  );
}
