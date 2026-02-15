import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { StudentOverview } from "@/components/dashboard/student/StudentOverview";

export default function StudentDashboard() {
  return (
    <StudentDashboardLayout>
      <StudentOverview />
    </StudentDashboardLayout>
  );
}
