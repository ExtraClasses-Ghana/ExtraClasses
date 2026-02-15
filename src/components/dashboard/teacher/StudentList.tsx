import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Star,
  Calendar,
  MessageSquare,
  Search
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      // Get unique students from sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("student_id, session_date")
        .eq("teacher_id", user?.id)
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
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
