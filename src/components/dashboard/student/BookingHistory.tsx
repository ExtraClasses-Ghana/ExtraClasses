import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Star,
  Filter,
  Download,
  Trash
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { generateStudentBookingHistoryPDF } from "@/lib/studentBookingPDF";
import { generatePDFFromTemplate } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface Session {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  teacher_id: string;
  amount: number;
}

interface TeacherInfo {
  full_name: string;
  avatar_url: string | null;
}

export function BookingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<(Session & { teacher?: TeacherInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, statusFilter]);

  // Realtime subscription for sessions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`student_booking_history_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime session update for student:", payload);
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from("sessions")
        .select("*")
        .eq("student_id", user?.id)
        .order("session_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: sessionsData } = await query.limit(50);

      if (sessionsData) {
        const sessionsWithTeachers = await Promise.all(
          sessionsData.map(async (session) => {
            const { data: teacherProfile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", session.teacher_id)
              .maybeSingle();
            return { ...session, teacher: teacherProfile || undefined };
          })
        );
        setSessions(sessionsWithTeachers);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-accent text-accent-foreground";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("student_id", user.id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({ title: "Deleted", description: "Session history entry deleted." });
    } catch (err) {
      console.error("Error deleting session:", err);
      toast({ title: "Error", description: "Could not delete the session.", variant: "destructive" });
    } finally {
      setDeletingSession(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Fetch student name from profile
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      const studentName = studentProfile?.full_name || "Student";
      
      // Prepare data for PDF
      const sessionsForPDF = sessions.map(session => ({
        id: session.id,
        subject: session.subject,
        session_date: session.session_date,
        start_time: session.start_time,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type,
        status: session.status,
        amount: session.amount,
        teacher: session.teacher ? {
          full_name: session.teacher.full_name,
          avatar_url: session.teacher.avatar_url
        } : undefined
      }));

      // Generate PDF content
      const htmlContent = generateStudentBookingHistoryPDF(sessionsForPDF, studentName);
      
      // Generate and download PDF
      const filename = `booking-history-${format(new Date(), 'yyyy-MM-dd')}`;
      await generatePDFFromTemplate(htmlContent, filename);

      toast({
        title: "Success",
        description: "Your booking history has been exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export booking history",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Booking History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your past and upcoming sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting} className="gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md p-2">
            <img src="/pdf-icon.png" alt="PDF" className="w-[50px] h-[50px]" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No sessions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={session.teacher?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {session.teacher?.full_name?.charAt(0) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {session.teacher?.full_name || "Teacher"}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {session.subject}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(session.session_date), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.start_time.slice(0, 5)} ({session.duration_minutes} min)
                      </span>
                      <span className="flex items-center gap-1">
                        {session.session_type === "online" ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {session.session_type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 mt-3 sm:mt-0">
                    <p className="font-semibold">GH₵{Number(session.amount).toFixed(0)}</p>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setDeletingSession(session.id)}>
                        <Trash className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    {session.status === "confirmed" && session.session_type === "online" && (
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          const { data } = await (supabase.from("video_sessions") as any)
                            .select("room_code")
                            .eq("session_id", session.id)
                            .maybeSingle();
                          if (data?.room_code) navigate(`/video/${data.room_code}`);
                        }}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Join
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              <Dialog open={!!deletingSession} onOpenChange={() => setDeletingSession(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Record</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this record? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setDeletingSession(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => deletingSession && handleDeleteSession(deletingSession)}>Delete</Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
