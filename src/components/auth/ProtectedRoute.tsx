import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "teacher" | "admin")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // If trying to access admin routes, redirect to admin login
    if (allowedRoles?.includes("admin")) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/" state={{ from: location, openAuth: true }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === "teacher") {
      return <Navigate to="/dashboard/teacher" replace />;
    } else if (role === "student") {
      return <Navigate to="/dashboard/student" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
