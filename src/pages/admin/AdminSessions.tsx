import { useState, useEffect, useMemo, useCallback } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Trash2,
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Search,
  
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

interface AdminSessionRow {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  amount: number;
  platform_fee?: number;
  created_at: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_email?: string;
  payment_status?: string;
  room_code?: string;
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      // Use RPC to fetch enriched session booking data
      const rpcClient = supabase as unknown as {
        rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>
      };

      const { data, error } = await rpcClient.rpc('get_admin_sessions');
      if (error) throw error;

      if (data && Array.isArray(data)) {
        // Map RPC rows into SessionItem structure
        const rows = (data as unknown) as AdminSessionRow[];
        const mapped = rows.map((s) => ({
          id: s.id,
          subject: s.subject,
          session_date: s.session_date,
          start_time: s.start_time,
          duration_minutes: s.duration_minutes,
          session_type: s.session_type,
          status: s.status,
          teacher_id: s.teacher_id,
          student_id: s.student_id,
          amount: s.amount,
          teacher: { full_name: s.teacher_name || '', email: s.teacher_email },
          student: { full_name: s.student_name || '', email: s.student_email },
          // attach extra fields so UI can use them
          payment_status: s.payment_status,
          room_code: s.room_code,
          created_at: s.created_at,
        } as SessionItem & { payment_status?: string; room_code?: string; created_at?: string }));

        setSessions(mapped);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('admin_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchSessions())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== id));
      setDeleteTargetId(null);
      toast({ title: 'Deleted', description: 'Session removed' });
    } catch (err) {
      console.error('Delete session error:', err);
      toast({ title: 'Error', description: 'Could not delete session', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    try {
      setChangingStatusId(id);
      const { error } = await supabase.from('sessions').update({ status }).eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      toast({ title: 'Updated', description: 'Session status updated' });
    } catch (err) {
      console.error('Change status error:', err);
      toast({ title: 'Error', description: 'Could not update status', variant: 'destructive' });
    } finally {
      setChangingStatusId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (dateFrom && new Date(s.session_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.session_date) > new Date(dateTo)) return false;
      if (!q) return true;
      return (
        s.subject?.toLowerCase().includes(q) ||
        s.student?.full_name?.toLowerCase().includes(q) ||
        s.teacher?.full_name?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase()?.includes(q) ||
        s.teacher_id?.toLowerCase()?.includes(q)
      );
    });
  }, [sessions, searchQuery, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminDashboardLayout title="Sessions" subtitle="Manage student/teacher sessions">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Sessions</CardTitle>
              <p className="text-sm text-muted-foreground">Manage and moderate student session requests</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input className="w-full sm:w-80" placeholder="Search by subject, student or teacher" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
                <Input type="date" onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">Loading sessions…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No sessions match your filters</div>
            ) : (
              <div className="space-y-3">
                {paged.map((s) => (
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
                      <Badge className={
                        s.status === 'confirmed' ? 'bg-accent text-accent-foreground' :
                        s.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        s.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-muted text-muted-foreground'
                      }>{s.status}</Badge>

                      <Select value={s.status} onValueChange={(v) => handleChangeStatus(s.id, v)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="ghost" size="sm" onClick={() => setSelectedSession(s)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(s.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">Showing {Math.min((page-1)*pageSize+1, filtered.length)}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
                    <div className="text-sm">Page {page} / {totalPages}</div>
                    <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Modal */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Details</DialogTitle>
              <DialogDescription />
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedSession.subject}</h3>
                  <p className="text-sm text-muted-foreground">{format(new Date(selectedSession.session_date), 'MMMM d, yyyy')} at {selectedSession.start_time.slice(0,5)}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p className="font-medium">{selectedSession.student?.full_name || selectedSession.student_id}</p>
                    <p className="text-sm text-muted-foreground">{selectedSession.student?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teacher</p>
                    <p className="font-medium">{selectedSession.teacher?.full_name || selectedSession.teacher_id}</p>
                    <p className="text-sm text-muted-foreground">{selectedSession.teacher?.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setSelectedSession(null)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTargetId} onOpenChange={() => !isDeleting && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete session?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteTargetId && handleDelete(deleteTargetId)} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
}
