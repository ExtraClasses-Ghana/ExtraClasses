import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  DollarSign, 
  Settings, 
  Bell,
  Shield,
  FileText,
  TrendingUp,
  Menu,
  X,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import logo from "@/assets/extraclasses-logo.webp";

interface AdminDashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/verification", icon: UserCheck, label: "Verification", badge: true },
  { href: "/admin/teachers", icon: Users, label: "Teachers" },
  { href: "/admin/students", icon: Users, label: "Students" },
  { href: "/admin/subjects", icon: FileText, label: "Subjects" },
  { href: "/admin/course-materials", icon: FileText, label: "Course Materials" },
  { href: "/admin/complaints", icon: FileText, label: "Complaints" },
  { href: "/admin/payments", icon: DollarSign, label: "Payments" },
  { href: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { href: "/admin/requests", icon: MessageSquare, label: "Requests" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminDashboardLayout({ children, title, subtitle }: AdminDashboardLayoutProps) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/admin" className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="ExtraClasses Ghana" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <span className="text-lg font-display font-bold text-primary">EXTRACLASSES</span>
                <span className="block text-xs text-muted-foreground">Admin Panel</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      New
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile?.full_name || "Admin"}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">{title}</h1>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
