import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { PaymentTracking } from "@/components/dashboard/student/PaymentTracking";

export default function StudentPayments() {
  return (
    <StudentDashboardLayout>
      <PaymentTracking />
    </StudentDashboardLayout>
  );
}
