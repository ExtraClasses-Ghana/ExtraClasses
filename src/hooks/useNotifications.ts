import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationCounts {
  unreadMessages: number;
  upcomingSessions: number;
  pendingPayments: number;
  favoriteUpdates: number;
}

export interface AppNotification {
  id: string;
  type: 'message' | 'session' | 'payment' | 'favorite';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationCounts>({
    unreadMessages: 0,
    upcomingSessions: 0,
    pendingPayments: 0,
    favoriteUpdates: 0,
  });
  
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        // Fetch unread messages count
        const { count: messageCount } = await supabase
          .from("messages")
          .select("id", { count: "exact" })
          .eq("receiver_id", userId)
          .eq("is_read", false);

        // Fetch upcoming sessions count
        const { count: sessionCount } = await supabase
          .from("sessions")
          .select("id", { count: "exact" })
          .or(`student_id.eq.${userId},teacher_id.eq.${userId}`)
          .gte("scheduled_date", new Date().toISOString())
          .neq("status", "completed");

        setNotifications({
          unreadMessages: messageCount || 0,
          upcomingSessions: sessionCount || 0,
          pendingPayments: 0, // Can be calculated from payments table
          favoriteUpdates: 0, // Can be calculated from favorites
        });
        
        // Build items array
        const newItems: AppNotification[] = [];
        if (messageCount && messageCount > 0) {
          newItems.push({
            id: 'msgs',
            type: 'message',
            title: 'New Messages',
            message: `You have ${messageCount} unread message(s)`,
            read: false,
            created_at: new Date().toISOString()
          });
        }
        if (sessionCount && sessionCount > 0) {
          newItems.push({
            id: 'sess',
            type: 'session',
            title: 'Upcoming Sessions',
            message: `You have ${sessionCount} upcoming session(s)`,
            read: false,
            created_at: new Date().toISOString()
          });
        }
        setItems(newItems);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Subscribe to real-time message changes
    const messageChannel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Subscribe to real-time session changes
    const sessionChannel = supabase
      .channel(`sessions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [userId]);

  const totalUnread = notifications.unreadMessages + notifications.upcomingSessions;

  return { ...notifications, totalUnread, items };
}
