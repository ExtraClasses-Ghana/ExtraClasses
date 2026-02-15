import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { BookingHistory } from "@/components/dashboard/student/BookingHistory";

export default function StudentHistory() {
  return (
    <StudentDashboardLayout>
      <BookingHistory />
    </StudentDashboardLayout>
  );
}
