import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { EarningsAnalytics } from "@/components/dashboard/teacher/EarningsAnalytics";

export default function TeacherEarnings() {
  return (
    <TeacherDashboardLayout>
      <EarningsAnalytics />
    </TeacherDashboardLayout>
  );
}
