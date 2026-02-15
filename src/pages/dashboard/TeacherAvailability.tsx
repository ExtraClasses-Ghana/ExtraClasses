import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { AvailabilityManager } from "@/components/dashboard/teacher/AvailabilityManager";

export default function TeacherAvailability() {
  return (
    <TeacherDashboardLayout>
      <AvailabilityManager />
    </TeacherDashboardLayout>
  );
}
