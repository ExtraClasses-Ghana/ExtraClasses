import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle, User, FileText, DollarSign, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_user_id: string | null;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for admin notifications
    const channel = supabase
      .channel("admin_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        (payload) => {
          console.log("Realtime admin notification:", payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      toast({
        title: "Done",
        description: "All notifications marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update notifications",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));

      toast({
        title: "Deleted",
        description: "Notification removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      setNotifications([]);

      toast({
        title: "Deleted",
        description: "All notifications removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notifications",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_teacher":
        return <User className="w-5 h-5" />;
      case "verification_pending":
        return <FileText className="w-5 h-5" />;
      case "payment":
        return <DollarSign className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AdminDashboardLayout
      title="Notifications"
      subtitle="Stay updated with platform activities"
    >
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30 relative">
                  <Bell className="w-6 h-6 text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                  )}
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Inbox
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                {unreadCount > 0 ? `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : "You're all caught up"}
              </motion.p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={markAllAsRead} 
                disabled={unreadCount === 0 || loading}
                className="rounded-xl flex-1 sm:flex-auto bg-background/50 border-white/20 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Mark All Read</span>
                <span className="sm:hidden">Read All</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={deleteAllNotifications}
                disabled={notifications.length === 0 || loading}
                className="rounded-xl flex-1 sm:flex-auto bg-background/50 border-white/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm overflow-hidden min-h-[500px]">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full absolute bg-primary/20 animate-ping" />
                    <Clock className="w-8 h-8 text-primary relative z-10 animate-bounce" />
                    <p className="mt-4 font-medium animate-pulse">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Bell className="w-10 h-10 text-muted-foreground opacity-30" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground/80">No notifications</h3>
                    <p className="text-sm mt-1">Platform activities will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    <AnimatePresence>
                      {notifications.map((notification, i) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 sm:p-6 transition-colors hover:bg-white/40 dark:hover:bg-white/5 group ${
                            !notification.is_read ? "bg-primary/5 dark:bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div
                              className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                                !notification.is_read
                                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                                  : "bg-muted text-muted-foreground ring-1 ring-white/20"
                              }`}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className={`text-base sm:text-lg pr-8 ${!notification.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                                    {notification.title}
                                  </h4>
                                  <p className={`text-sm mt-1 leading-relaxed ${!notification.is_read ? 'text-foreground/90 font-medium' : 'text-muted-foreground'}`}>
                                    {notification.message}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <Badge className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30 border-none">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border/50">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(notification.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                <div className="flex items-center gap-3 ml-auto opacity-70 group-hover:opacity-100 transition-opacity">
                                  {!notification.is_read && (
                                    <button
                                      onClick={() => markAsRead(notification.id)}
                                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors uppercase tracking-wider"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}