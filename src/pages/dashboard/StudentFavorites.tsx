import { StudentDashboardLayout } from "@/components/dashboard/StudentDashboardLayout";
import { FavoriteTeachers } from "@/components/dashboard/student/FavoriteTeachers";

export default function StudentFavorites() {
  return (
    <StudentDashboardLayout>
      <FavoriteTeachers />
    </StudentDashboardLayout>
  );
}
