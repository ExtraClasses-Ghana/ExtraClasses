import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardSession {
  id: string;
  student_id: string;
  teacher_id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  amount: number;
  teacher_profile?: {
    full_name: string;
    avatar_url: string | null;
    hourly_rate: number | null;
  };
  education_level?: string | null;
}

interface SessionResponse {
  id: string;
  student_id: string;
  teacher_id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  amount: number;
  teacher_profiles: Array<{ education_level: string | null; bio: string | null }>;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

/**
 * Fetch sessions/bookings for student dashboard filtered by their education level
 */
export function useDashboardSessionsByEducationLevel() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id || !profile?.education_level) {
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch sessions for this student
        const { data, error: queryError } = await supabase
          .from("sessions")
          .select(`
            id,
            student_id,
            teacher_id,
            subject,
            session_date,
            start_time,
            duration_minutes,
            status,
            amount,
            teacher_profiles (
              education_level,
              bio
            ),
            profiles!teacher_id (
              full_name,
              avatar_url
            )
          `)
          .eq("student_id", user!.id)
          .order("session_date", { ascending: false });

        if (queryError) throw queryError;

        // Filter sessions where teacher's education level matches student's education level
        const filteredSessions: DashboardSession[] = ((data as unknown as SessionResponse[]) || [])
          .filter((session) => {
            const teacherEducationLevel = session.teacher_profiles?.[0]?.education_level;
            return teacherEducationLevel === profile.education_level;
          })
          .map((session) => ({
            id: session.id,
            student_id: session.student_id,
            teacher_id: session.teacher_id,
            subject: session.subject,
            session_date: session.session_date,
            start_time: session.start_time,
            duration_minutes: session.duration_minutes,
            status: session.status,
            amount: session.amount,
            education_level: session.teacher_profiles?.[0]?.education_level,
            teacher_profile: {
              full_name: session.profiles?.full_name || "Unknown",
              avatar_url: session.profiles?.avatar_url || null,
              hourly_rate: null, // Can be added if needed
            },
          }));

        setSessions(filteredSessions);
      } catch (err) {
        setError(err as Error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user?.id, profile?.education_level, user]);

  return { sessions, loading, error };
}

/**
 * Fetch relevant content/materials for student dashboard based on education level
 */
export interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  type: string;
  education_level?: string | null;
  level: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  is_free: boolean | null;
  price: number | null;
  downloads: number | null;
  rating: number | null;
  is_active: boolean | null;
  subject_id?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useDashboardContentByEducationLevel() {
  const { profile } = useAuth();
  const [content, setContent] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profile?.education_level) {
      setContent([]);
      return;
    }

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = supabase
          .from("course_materials")
          .select("*")
          .eq("is_active", true)
          .eq("education_level", profile.education_level || "");

        // If tertiary with sub-category, add that filter
        if (profile.education_level === "Tertiary" && profile.education_sub_category) {
          // Note: This assumes course_materials table has education_sub_category column
          // If not, you may need to adjust the filtering logic
        }

        const { data, error: queryError } = await query.order("created_at", { ascending: false }).limit(10);

        if (queryError) throw queryError;
        setContent((data as unknown as CourseMaterial[]) || []);
      } catch (err) {
        setError(err as Error);
        setContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [profile?.education_level, profile?.education_sub_category]);

  return { content, loading, error };
}
