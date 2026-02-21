import { useState, useEffect } from "react";

// These are hardcoded since education_levels and education_sub_categories
// need to be added to Supabase types. In a production environment, you would
// fetch these from the database after updating the Supabase schema.

export interface EducationLevel {
  id: string;
  level_name: string;
  description: string | null;
  sort_order: number | null;
}

export interface EducationSubCategory {
  id: string;
  category_name: string;
  description: string | null;
  sort_order: number | null;
}

// Education Category: flat list for user selection
export const EDUCATION_CATEGORIES = [
  "Basic",
  "JHS",
  "SHS",
  "College Of Healths",
  "University",
  "Cyber Secutity",
  "Graphic Design",
  "Web Design",
] as const;

export type EducationCategory = (typeof EDUCATION_CATEGORIES)[number];

const EDUCATION_LEVELS: EducationLevel[] = EDUCATION_CATEGORIES.map((name, i) => ({
  id: String(i + 1),
  level_name: name,
  description: null,
  sort_order: i + 1,
}));

const EDUCATION_SUB_CATEGORIES: EducationSubCategory[] = [
  { id: "1", category_name: "Nursing", description: "Nursing Programs", sort_order: 1 },
  { id: "2", category_name: "Midwifery", description: "Midwifery Programs", sort_order: 2 },
  { id: "3", category_name: "Health College", description: "Health Science Colleges", sort_order: 3 },
  { id: "4", category_name: "Teacher Training College", description: "Teacher Training Institutions", sort_order: 4 },
  { id: "5", category_name: "Universities", description: "University Programs", sort_order: 5 },
];

export function useEducationLevels() {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate async fetch with hardcoded data
    setLoading(true);
    try {
      setLevels(EDUCATION_LEVELS);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { levels, loading, error };
}

export function useEducationSubCategories() {
  const [categories, setCategories] = useState<EducationSubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate async fetch with hardcoded data
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
