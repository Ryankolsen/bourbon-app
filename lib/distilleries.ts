import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const DISTILLERY_SEARCH_LIMIT = 20;

/**
 * Query distinct non-null distillery values from the bourbons table,
 * filtered case-insensitively by `search`, ordered alphabetically,
 * capped at DISTILLERY_SEARCH_LIMIT results.
 */
export async function buildDistillerySearchQuery(
  supabase: SupabaseClient<Database>,
  search: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('bourbons')
    .select('distillery')
    .ilike('distillery', `%${search}%`)
    .not('distillery', 'is', null)
    .neq('distillery', '')
    .order('distillery')
    .limit(DISTILLERY_SEARCH_LIMIT);

  if (error || !data) return [];

  const distilleries = (data as Array<{ distillery: string | null }>)
    .map((row) => row.distillery)
    .filter((d): d is string => Boolean(d));

  return [...new Set(distilleries)].sort().slice(0, DISTILLERY_SEARCH_LIMIT);
}
