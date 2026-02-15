import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Check,
  X,
  Filter,
  Download
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generateTeacherSessionsPDF } from "@/lib/teacherSessionsPDF";
import { generatePDFFromTemplate } from "@/lib/pdfExport";

interface Session {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  student_id: string;
  amount: number;
  notes: string | null;
}

interface StudentInfo {
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export function SessionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<(Session & { student?: StudentInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, activeTab]);

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from("sessions")
        .select("*")
        .eq("teacher_id", user?.id)
        .order("session_date", { ascending: true });

      if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else if (activeTab === "upcoming") {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq("status", "confirmed").gte("session_date", today);
      } else if (activeTab === "completed") {
        query = query.eq("status", "completed");
      }

      const { data: sessionsData } = await query.limit(50);

      if (sessionsData) {
        const sessionsWithStudents = await Promise.all(
          sessionsData.map(async (session) => {
            const { data: studentProfile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, email")
              .eq("user_id", session.student_id)
              .maybeSingle();
            return { ...session, student: studentProfile || undefined };
          })
        );
        setSessions(sessionsWithStudents);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: newStatus })
        .eq("id", sessionId);

      if (error) throw error;

      // Auto-create video session when confirming an online session
      if (newStatus === "confirmed") {
        const session = sessions.find((s) => s.id === sessionId);
        if (session?.session_type === "online") {
          await (supabase.from("video_sessions") as any).insert({
            session_id: sessionId,
          });
        }
      }

      toast({
        title: newStatus === "confirmed" ? "Session Confirmed" : "Session Declined",
        description: `The session has been ${newStatus}.`
      });

      fetchSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive"
      });
    }
  };

  const joinVideoCall = async (sessionId: string) => {
    const { data } = await (supabase.from("video_sessions") as any)
      .select("room_code")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data?.room_code) {
      navigate(`/video/${data.room_code}`);
    } else {
      toast({ title: "No video session found", variant: "destructive" });
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

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Get teacher name
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      const teacherName = teacherProfile?.full_name || "Teacher";

      // Prepare sessions data for PDF
      const sessionsForPDF = sessions.map(session => ({
        id: session.id,
        student_name: session.student?.full_name || 'Student',
        subject: session.subject,
        session_date: session.session_date,
        start_time: session.start_time,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type,
        status: session.status,
        amount: session.amount
      }));

      // Generate PDF content
      const htmlContent = generateTeacherSessionsPDF(sessionsForPDF, teacherName);

      // Generate and download PDF
      const filename = `sessions-report-${format(new Date(), 'yyyy-MM-dd')}`;
      await generatePDFFromTemplate(htmlContent, filename);

      toast({
        title: "Success",
        description: "Your sessions report has been exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export sessions report",
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
            Session Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your teaching sessions and requests
          </p>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No {activeTab} sessions
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={session.student?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {session.student?.full_name?.charAt(0) || "S"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              {session.student?.full_name || "Student"}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {session.subject}
                            </Badge>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(session.session_date), "EEEE, MMM d, yyyy")}
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
                          {session.notes && (
                            <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              Note: {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-lg">GH₵{Number(session.amount).toFixed(0)}</p>
                          {session.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => updateSessionStatus(session.id, "cancelled")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateSessionStatus(session.id, "confirmed")}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                            </div>
                          )}
                          {session.status === "confirmed" && session.session_type === "online" && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => joinVideoCall(session.id)}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Join Video
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
