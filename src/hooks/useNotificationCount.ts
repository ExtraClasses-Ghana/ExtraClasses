import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('contact_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages'
        },
        (payload) => {
          // Refetch count when any change occurs
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  return { unreadCount, loading };
}