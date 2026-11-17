import { supabase } from "./supabase";

const CACHE_TTL = 5 * 60 * 1000;

let cache = { data: null, fetchedAt: 0 };
let inFlight = null;
let generation = 0;

export function invalidateVaultCache() {
  generation += 1;
  cache = { data: null, fetchedAt: 0 };
  inFlight = null;
}

export const clearSearchCache = invalidateVaultCache;

export async function fetchVaultData({ force = false } = {}) {
  if (!force && cache.data && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  if (!force && inFlight) return inFlight;

  const requestGeneration = generation;

  inFlight = (async () => {
    const [subjectRes, contentRes] = await Promise.all([
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("content")
        .select("*, subjects(name, code)")
        .order("created_at", { ascending: false }),
    ]);

    if (subjectRes.error) throw subjectRes.error;
    if (contentRes.error) throw contentRes.error;

    const data = {
      subjects: subjectRes.data || [],
      contents: contentRes.data || [],
    };

    if (requestGeneration === generation) {
      cache = { data, fetchedAt: Date.now() };
    }

    return data;
  })();

  try {
    return await inFlight;
  } finally {
    if (requestGeneration === generation) inFlight = null;
  }
}
