import React, { useState } from 'react';
import { Bell, MessageSquare, Calendar, ShieldAlert, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export function GlobalNotificationBell({ role }: { role: string }) {
  const { user } = useAuth();
  const { items, totalUnread } = useNotifications(user?.id);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = async (notification: any) => {
    setIsOpen(false);
    
    // Default routing based on role and type
    if (role === 'admin') {
      if (notification.type === 'message') navigate('/dashboard/admin'); // Placeholder if messages for admin doesn't exist directly
      else if (notification.type === 'teacher_verification') navigate('/admin/requests');
      else if (notification.type === 'session') navigate('/admin/sessions');
      else if (notification.type === 'withdrawal') navigate('/admin/withdrawals');
      else navigate('/dashboard/admin');
    } else if (role === 'teacher') {
      if (notification.type === 'message') navigate('/dashboard/teacher/messages');
      else if (notification.type === 'session') navigate('/dashboard/teacher/sessions');
      else if (notification.type === 'withdrawal') navigate('/dashboard/teacher/withdrawals');
      else navigate('/dashboard/teacher');
    } else {
      if (notification.type === 'message') navigate('/dashboard/student/messages');
      else if (notification.type === 'session') navigate('/dashboard/student');
      else navigate('/dashboard/student');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'session': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'teacher_verification': return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'withdrawal': return <CreditCard className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-2xl border-white/10 glassmorphism bg-background/95 backdrop-blur-xl z-[150]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Notifications</h4>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {totalUnread} new
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[350px] overflow-y-auto no-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">There are no new notifications for you right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-background border ${!notif.read ? 'border-primary/20' : 'border-border'}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm tracking-tight ${!notif.read ? 'font-semibold text-foreground' : 'text-foreground/80 font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className={`text-xs mt-0.5 truncate ${!notif.read ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                       <Clock className="w-3 h-3"/>
                       {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="shrink-0 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
