import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EducationLevel {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export function useEducationLevels() {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLevels = async () => {
      try {
        const { data, error } = await supabase
          .from('education_levels')
          .select('id, name, description, created_at')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!mounted) return;
        setLevels((data || []) as EducationLevel[]);
      } catch (err) {
        console.error('Failed to load education levels', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLevels();

    const channel = supabase
      .channel('education_levels_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'education_levels' }, () => fetchLevels())
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { levels, loading };
}
