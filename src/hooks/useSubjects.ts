import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topics: string[] | null;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("subjects")
          .select("id, name, description, icon, topics")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (fetchError) throw fetchError;
        setSubjects(data || []);
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch subjects");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  return { subjects, loading, error };
}
