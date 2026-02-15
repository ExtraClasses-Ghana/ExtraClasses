import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle, User, FileText, DollarSign, Trash2 } from "lucide-react";

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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={deleteAllNotifications} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-muted-foreground">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  !notification.is_read ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        !notification.is_read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Badge variant="default" className="ml-2">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
