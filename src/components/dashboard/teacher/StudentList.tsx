import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Star,
  Calendar,
  MessageSquare,
  Search,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatWindow } from "@/components/dashboard/ChatWindow";
import { toast } from "sonner";
import { RescheduleModal } from "@/components/teacher/RescheduleModal";

interface StudentData {
  student_id: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    region: string | null;
  };
  sessionsCount: number;
  lastSession: string | null;
}

export function StudentList() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentChat, setSelectedStudentChat] = useState<StudentData | null>(null);
  const [selectedStudentReschedule, setSelectedStudentReschedule] = useState<StudentData | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<StudentData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  // Realtime subscription for sessions (to update student list when new bookings come in)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`teacher_student_list_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `teacher_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime session update for student list:", payload);
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchStudents = async () => {
    try {
      // Get unique students from sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("student_id, session_date")
        .eq("teacher_id", user?.id as string)
        .order("session_date", { ascending: false });

      if (sessions) {
        // Group by student
        const studentMap = new Map<string, { count: number; lastSession: string }>();
        sessions.forEach(session => {
          const existing = studentMap.get(session.student_id);
          if (!existing) {
            studentMap.set(session.student_id, {
              count: 1,
              lastSession: session.session_date
            });
          } else {
            studentMap.set(session.student_id, {
              count: existing.count + 1,
              lastSession: existing.lastSession
            });
          }
        });

        // Fetch profiles
        const studentsData: StudentData[] = await Promise.all(
          Array.from(studentMap.entries()).map(async ([studentId, data]) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, email, region")
              .eq("user_id", studentId)
              .maybeSingle();

            return {
              student_id: studentId,
              profile: profile || undefined,
              sessionsCount: data.count,
              lastSession: data.lastSession
            };
          })
        );

        setStudents(studentsData);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;

    setIsDeleting(true);
    try {
      // Delete all sessions with this student
      const { error: deleteError } = await supabase
        .from("sessions")
        .delete()
        .eq("teacher_id", user?.id as string)
        .eq("student_id", deleteConfirmStudent.student_id);

      if (deleteError) throw deleteError;

      // Remove student from list
      setStudents(prev => prev.filter(s => s.student_id !== deleteConfirmStudent.student_id));
      toast.success(`${deleteConfirmStudent.profile?.full_name} has been removed.`);
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to remove student");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmStudent(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            My Students
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your students
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {students.length} Students
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? "No students found" : "No students yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.student_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={student.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {student.profile?.full_name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {student.profile?.full_name || "Student"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {student.profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Sessions</span>
                      <span className="font-medium">{student.sessionsCount}</span>
                    </div>
                    {student.profile?.region && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium">{student.profile.region}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedStudentChat(student)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedStudentReschedule(student)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmStudent(student)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      <Dialog open={!!selectedStudentChat} onOpenChange={() => setSelectedStudentChat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedStudentChat?.profile?.avatar_url || ""} />
                <AvatarFallback>
                  {selectedStudentChat?.profile?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedStudentChat?.profile?.full_name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedStudentChat && (
              <ChatWindow
                partner={{
                  partnerId: selectedStudentChat.student_id,
                  partnerName: selectedStudentChat.profile?.full_name || "Student",
                  partnerAvatar: selectedStudentChat.profile?.avatar_url || ""
                }}
                messages={[]}
                loading={false}
                currentUserId={user?.id}
                newMessage=""
                onMessageChange={() => {}}
                onSendMessage={() => {}}
                onAddEmoji={() => {}}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      {selectedStudentReschedule && (
        <RescheduleModal
          studentId={selectedStudentReschedule.student_id}
          studentName={selectedStudentReschedule.profile?.full_name || "Student"}
          isOpen={!!selectedStudentReschedule}
          onClose={() => setSelectedStudentReschedule(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmStudent} onOpenChange={() => setDeleteConfirmStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteConfirmStudent?.profile?.full_name} from your student list? 
              This will delete all sessions with this student. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}