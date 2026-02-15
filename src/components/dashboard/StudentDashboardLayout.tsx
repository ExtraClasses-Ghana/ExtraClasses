import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  Heart, 
  MessageSquare, 
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/extraclasses-logo.webp";

const menuItems = [
  { icon: Calendar, label: "Upcoming Sessions", path: "/dashboard/student" },
  { icon: Clock, label: "Booking History", path: "/dashboard/student/history" },
  { icon: CreditCard, label: "Payments", path: "/dashboard/student/payments" },
  { icon: Heart, label: "Favorite Teachers", path: "/dashboard/student/favorites" },
  { icon: MessageSquare, label: "Messages", path: "/dashboard/student/messages" },
  { icon: Settings, label: "Settings", path: "/dashboard/student/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function StudentDashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const notifications = useNotifications(user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen bg-card border-r border-border transition-all duration-300 ${
          isSidebarOpen 
            ? "w-64 translate-x-0" 
            : isMobile 
              ? "-translate-x-full w-64" 
              : "w-20"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="ExtraClasses Ghana" 
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm text-primary">
                  EXTRACLASSES
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-secondary -mt-1">
                  GHANA
                </span>
              </div>
            )}
          </Link>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-border ${!isSidebarOpen && !isMobile ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <Avatar className={`${isSidebarOpen ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">Student</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`p-4 space-y-2 ${!isSidebarOpen && !isMobile ? 'px-2' : ''}`}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const notificationCount = 
              item.label === "Upcoming Sessions" ? notifications.upcomingSessions :
              item.label === "Messages" ? notifications.unreadMessages :
              item.label === "Payments" ? notifications.pendingPayments :
              0;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground/80"
                } ${!isSidebarOpen && !isMobile ? 'justify-center px-0' : ''}`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && (
                  <>
                    <span className="font-medium flex-1">{item.label}</span>
                    {notificationCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full bg-secondary text-secondary-foreground ml-auto">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </>
                )}
                {!isSidebarOpen && notificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 text-xs font-bold rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className={`absolute bottom-4 left-4 right-4 ${!isSidebarOpen && !isMobile ? 'left-2 right-2' : ''}`}>
          <Button
            variant="ghost"
            className={`w-full gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 ${
              isSidebarOpen ? 'justify-start' : 'justify-center'
            }`}
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-card border-b border-border flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-3"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="ExtraClasses Ghana" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-display font-bold text-sm text-primary">EXTRACLASSES</span>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isMobile 
            ? "ml-0 pt-16" 
            : isSidebarOpen 
              ? "ml-64" 
              : "ml-20"
        }`}
      >
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
