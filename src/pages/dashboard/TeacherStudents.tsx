import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { StudentList } from "@/components/dashboard/teacher/StudentList";

export default function TeacherStudents() {
  return (
    <TeacherDashboardLayout>
      <StudentList />
    </TeacherDashboardLayout>
  );
}
