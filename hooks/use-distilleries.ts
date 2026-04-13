import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { buildDistillerySearchQuery } from '@/lib/distilleries';

const DISTILLERIES_DEBOUNCE_MS = 400;

export function useDistilleries(search: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DISTILLERIES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ['distilleries', debouncedSearch],
    queryFn: () => buildDistillerySearchQuery(supabase, debouncedSearch),
    enabled: debouncedSearch.trim().length > 0,
    staleTime: 30_000,
  });

  return {
    distilleries: query.data ?? [],
    isLoading: query.isLoading,
  };
}
