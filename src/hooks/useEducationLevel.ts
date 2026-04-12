import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EducationLevel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  position?: number;
}

export interface EducationSubCategory {
  id: string;
  category_name: string;
  description: string | null;
  sort_order: number | null;
}

// Global cached promise to avoid duplicate queries
let cachedEducationLevelsPromise: Promise<EducationLevel[]> | null = null;
let cachedEducationLevels: EducationLevel[] | null = null;

export function useEducationLevels() {
  const [levels, setLevels] = useState<EducationLevel[]>(cachedEducationLevels || []);
  const [loading, setLoading] = useState(!cachedEducationLevels);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLevels() {
      if (cachedEducationLevels) {
        if (isMounted) {
          setLevels(cachedEducationLevels);
          setLoading(false);
        }
        return;
      }

      if (!cachedEducationLevelsPromise) {
        cachedEducationLevelsPromise = (async () => {
          const { data, error } = await (supabase as any)
            .from('education_levels')
            .select('*')
            .order('position', { ascending: true });

          if (error) {
            throw new Error(error.message);
          }

          const fetchedLevels = data as EducationLevel[];
          cachedEducationLevels = fetchedLevels;
          return fetchedLevels;
        })();
      }

      try {
        const data = await cachedEducationLevelsPromise;
        if (isMounted) {
          setLevels(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
        }
        cachedEducationLevelsPromise = null; // reset if error
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLevels();

    return () => {
      isMounted = false;
    };
  }, []);

  return { levels, loading, error };
}

// Keeping subcategories hardcoded for now until we have a database table for them
const EDUCATION_SUB_CATEGORIES: EducationSubCategory[] = [
  { id: "1", category_name: "Nursing", description: "Nursing Programs", sort_order: 1 },
  { id: "2", category_name: "Midwifery", description: "Midwifery Programs", sort_order: 2 },
  { id: "3", category_name: "Health College", description: "Health Science Colleges", sort_order: 3 },
  { id: "4", category_name: "Teacher Training College", description: "Teacher Training Institutions", sort_order: 4 },
  { id: "5", category_name: "Universities", description: "University Programs", sort_order: 5 },
];

export function useEducationSubCategories() {
  const [categories, setCategories] = useState<EducationSubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      setCategories(EDUCATION_SUB_CATEGORIES);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { categories, loading, error };
}
