import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Map Education Category to subject filter level (subjects use Basic/Secondary/Tertiary) */
function mapCategoryToSubjectLevel(category: string | null): string | null {
  if (!category) return null;
  if (category === "Basic" || category === "JHS") return "Basic";
  if (category === "SHS") return "Secondary";
  if (["College Of Healths", "University", "Cyber Secutity", "Graphic Design", "Web Design"].includes(category)) {
    return "Tertiary";
  }
  return "Tertiary"; // fallback for any new categories
}

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
 * Fetch subjects filtered by education level and optionally sub-category
 */
export function useSubjectsByEducationLevel(
  educationLevel: string | null,
  educationSubCategory?: string | null
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

        const subjectLevel = mapCategoryToSubjectLevel(educationLevel);

        let query = supabase
          .from("subjects")
          .select("*")
          .eq("is_active", true)
          .eq("education_level", subjectLevel);

        // If sub-category is provided and it's a tertiary-level category, filter by it
        if (educationSubCategory && subjectLevel === "Tertiary") {
          query = query.eq("education_sub_category", educationSubCategory);
        }

        const { data, error: queryError } = await query.order("name", { ascending: true });

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
  }, [educationLevel, educationSubCategory]);

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
