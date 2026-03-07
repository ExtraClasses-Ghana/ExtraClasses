import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import TeacherProfile from "./pages/TeacherProfile";
import TeacherSearch from "./pages/TeacherSearch";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import Subjects from "./pages/Subjects";
import CourseMaterials from "./pages/CourseMaterials";
import VideoCall from "./pages/VideoCall";

// Student Dashboard Pages
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import StudentHistory from "./pages/dashboard/StudentHistory";
import StudentPayments from "./pages/dashboard/StudentPayments";
import StudentFavorites from "./pages/dashboard/StudentFavorites";
import StudentMessages from "./pages/dashboard/StudentMessages";
import StudentSettings from "./pages/dashboard/StudentSettings";

// Teacher Dashboard Pages
import TeacherDashboard from "./pages/dashboard/TeacherDashboard";
import TeacherSessions from "./pages/dashboard/TeacherSessions";
import TeacherEarnings from "./pages/dashboard/TeacherEarnings";
import TeacherStudents from "./pages/dashboard/TeacherStudents";
import TeacherAvailability from "./pages/dashboard/TeacherAvailability";
import TeacherMessages from "./pages/dashboard/TeacherMessages";
import TeacherSettings from "./pages/dashboard/TeacherSettings";
import TeacherCredentials from "./pages/dashboard/TeacherCredentials";
import TeacherWithdrawals from "./pages/dashboard/TeacherWithdrawals";

// Admin Dashboard Pages
import AdminLogin from "./pages/admin/AdminLogin";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerification from "./pages/admin/AdminVerification";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminCourseMaterials from "./pages/admin/AdminCourseMaterials";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminTWR from "./pages/admin/AdminTWR";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminEducationLevels from "./pages/admin/AdminEducationLevels";

// UI Components (after pages to avoid circular deps)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageTransition } from "@/components/ui/PageTransition";

// Query Client
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PageTransition><Index /></PageTransition>} />
            <Route path="/teacher/:id" element={<PageTransition><TeacherProfile /></PageTransition>} />
            <Route path="/teachers" element={<PageTransition><TeacherSearch /></PageTransition>} />
            <Route path="/about" element={<PageTransition><AboutUs /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/subjects" element={<PageTransition><Subjects /></PageTransition>} />
            <Route path="/course-materials" element={<PageTransition><CourseMaterials /></PageTransition>} />
            <Route path="/video/:roomCode" element={<VideoCall />} />

            {/* Admin Login (Public) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Student Dashboard Routes */}
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/history"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/payments"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/favorites"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentFavorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/messages"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/settings"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentSettings />
                </ProtectedRoute>
              }
            />

            {/* Teacher Dashboard Routes */}
            <Route
              path="/dashboard/teacher"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/sessions"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherSessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/earnings"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/students"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/availability"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherAvailability />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/messages"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/settings"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/credentials"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherCredentials />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher/withdrawals"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherWithdrawals />
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verification"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTeachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminSubjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/course-materials"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminCourseMaterials />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sessions"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminSessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/education-levels"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminEducationLevels />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/twr"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTWR />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
