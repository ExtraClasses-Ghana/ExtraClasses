import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { SessionManagement } from "@/components/dashboard/teacher/SessionManagement";

export default function TeacherSessions() {
  return (
    <TeacherDashboardLayout>
      <SessionManagement />
    </TeacherDashboardLayout>
  );
}
