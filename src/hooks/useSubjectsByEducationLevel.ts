import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubjectWithLevel {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topics: string[] | null;
  education_level: string | null;
  education_sub_category: string | null;
  teacher_count?: number | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch subjects filtered by education level (same format as profiles: Basic, JHS, SHS, etc.)
 */
export function useSubjectsByEducationLevel(
  educationLevel: string | null,
  _educationSubCategory?: string | null
) {
  const [subjects, setSubjects] = useState<SubjectWithLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!educationLevel) {
      setSubjects([]);
      return;
    }

    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from("subjects")
          .select("*")
          .eq("is_active", true)
          .eq("education_level", educationLevel)
          .order("name", { ascending: true });

        if (queryError) throw queryError;
        setSubjects((data as SubjectWithLevel[]) || []);
      } catch (err) {
        setError(err as Error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [educationLevel]);

  return { subjects, loading, error };
}

/**
 * Fetch all active subjects for a teacher (no educational level filter)
 * Use this when you don't need education level filtering
 */
export function useAllSubjects() {
  const [subjects, setSubjects] = useState<SubjectWithLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from("subjects")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (queryError) throw queryError;
        setSubjects((data as SubjectWithLevel[]) || []);
      } catch (err) {
        setError(err as Error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  return { subjects, loading, error };
}
