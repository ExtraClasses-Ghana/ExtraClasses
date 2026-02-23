import { useState, useEffect } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Trash2,
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionItem {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  teacher_id: string;
  student_id: string;
  amount: number;
  teacher?: { full_name: string; email?: string };
  student?: { full_name: string; email?: string };
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('admin_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          // Refresh list on any change
          fetchSessions();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .limit(100);

      if (data) {
        const withProfiles = await Promise.all(
          data.map(async (s: any) => {
            const [teacherRes, studentRes] = await Promise.all([
              supabase.from('profiles').select('full_name, email').eq('user_id', s.teacher_id).maybeSingle(),
              supabase.from('profiles').select('full_name, email').eq('user_id', s.student_id).maybeSingle(),
            ]);
            return {
              ...s,
              teacher: teacherRes.data || undefined,
              student: studentRes.data || undefined,
            } as SessionItem;
          })
        );
        setSessions(withProfiles);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Deleted', description: 'Session removed' });
    } catch (err) {
      console.error('Delete session error:', err);
      toast({ title: 'Error', description: 'Could not delete session', variant: 'destructive' });
    }
  };

  return (
    <AdminDashboardLayout title="Sessions" subtitle="Manage student/teacher sessions">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sessions ({sessions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No sessions found</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="p-4 border rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          <User className="w-3 h-3 inline mr-1" /> {s.student?.full_name || s.student_id} • <User className="w-3 h-3 inline mr-1" /> {s.teacher?.full_name || s.teacher_id}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" /> {format(new Date(s.session_date), 'MMM d, yyyy')} • <Clock className="w-3 h-3 inline mr-1" /> {s.start_time.slice(0,5)} • {s.session_type === 'online' ? <Video className="w-3 h-3 inline mr-1" /> : <MapPin className="w-3 h-3 inline mr-1" />}{' '}{s.session_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
