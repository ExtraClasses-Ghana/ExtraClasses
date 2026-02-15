import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { TeacherOverview } from "@/components/dashboard/teacher/TeacherOverview";

export default function TeacherDashboard() {
  return (
    <TeacherDashboardLayout>
      <TeacherOverview />
    </TeacherDashboardLayout>
  );
}
