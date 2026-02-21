import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherWithEducation {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  region: string | null;
  bio: string | null;
  hourly_rate: number | null;
  education_level: string | null;
  education_sub_category: string | null;
  subjects: string[] | null;
  rating: number | null;
  total_reviews: number | null;
  is_verified: boolean | null;
}

/**
 * Fetch teachers filtered by education level and optionally by subject
 */
export function useTeachersByEducationLevel(
  educationLevel: string | null,
  educationSubCategory?: string | null,
  subject?: string | null
) {
  const [teachers, setTeachers] = useState<TeacherWithEducation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!educationLevel) {
      setTeachers([]);
      return;
    }

    const fetchTeachers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch teacher profiles filtered by education level
        let query = supabase
          .from("teacher_profiles")
          .select(`
            user_id,
            education_level,
            education_sub_category,
            bio,
            subjects,
            hourly_rate,
            rating,
            total_reviews,
            is_verified,
            profiles (
              full_name,
              email,
              avatar_url,
              region
            )
          `)
          .eq("education_level", educationLevel);

        // If sub-category is provided, filter by it
        if (educationSubCategory && educationLevel === "Tertiary") {
          query = query.eq("education_sub_category", educationSubCategory);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        // Transform and filter by subject if provided
        interface RawTeacher {
          user_id: string;
          education_level: string | null;
          education_sub_category: string | null;
          bio: string | null;
          subjects: string[] | null;
          hourly_rate: number | null;
          rating: number | null;
          total_reviews: number | null;
          is_verified: boolean | null;
          profiles: { full_name: string | null; email: string | null; avatar_url: string | null; region: string | null } | null;
        }

        const teacherList: TeacherWithEducation[] = ((data as unknown as RawTeacher[]) || [])
          .map((teacher) => ({
            user_id: teacher.user_id,
            full_name: teacher.profiles?.full_name || "Unknown",
            email: teacher.profiles?.email || "",
            avatar_url: teacher.profiles?.avatar_url || null,
            region: teacher.profiles?.region || null,
            bio: teacher.bio,
            hourly_rate: teacher.hourly_rate,
            education_level: teacher.education_level,
            education_sub_category: teacher.education_sub_category,
            subjects: teacher.subjects,
            rating: teacher.rating,
            total_reviews: teacher.total_reviews,
            is_verified: teacher.is_verified,
          }))
          .filter((teacher) => {
            if (!subject) return true;
            return teacher.subjects && teacher.subjects.includes(subject);
          });

        setTeachers(teacherList);
      } catch (err) {
        setError(err as Error);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [educationLevel, educationSubCategory, subject]);

  return { teachers, loading, error };
}

/**
 * Fetch all verified teachers without education level filtering
 */
export function useAllTeachers(subject?: string | null) {
  const [teachers, setTeachers] = useState<TeacherWithEducation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from("teacher_profiles")
          .select(`
            user_id,
            education_level,
            education_sub_category,
            bio,
            subjects,
            hourly_rate,
            rating,
            total_reviews,
            is_verified,
            profiles (
              full_name,
              email,
              avatar_url,
              region
            )
          `)
          .eq("is_verified", true);

        if (queryError) throw queryError;

        // Transform and filter by subject if provided
        interface RawTeacher2 {
          user_id: string;
          education_level: string | null;
          education_sub_category: string | null;
          bio: string | null;
          subjects: string[] | null;
          hourly_rate: number | null;
          rating: number | null;
          total_reviews: number | null;
          is_verified: boolean | null;
          profiles: { full_name: string | null; email: string | null; avatar_url: string | null; region: string | null } | null;
        }

        const teacherList: TeacherWithEducation[] = ((data as unknown as RawTeacher2[]) || [])
          .map((teacher) => ({
            user_id: teacher.user_id,
            full_name: teacher.profiles?.full_name || "Unknown",
            email: teacher.profiles?.email || "",
            avatar_url: teacher.profiles?.avatar_url || null,
            region: teacher.profiles?.region || null,
            bio: teacher.bio,
            hourly_rate: teacher.hourly_rate,
            education_level: teacher.education_level,
            education_sub_category: teacher.education_sub_category,
            subjects: teacher.subjects,
            rating: teacher.rating,
            total_reviews: teacher.total_reviews,
            is_verified: teacher.is_verified,
          }))
          .filter((teacher) => {
            if (!subject) return true;
            return teacher.subjects && teacher.subjects.includes(subject);
          });

        setTeachers(teacherList);
      } catch (err) {
        setError(err as Error);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [subject]);

  return { teachers, loading, error };
}
