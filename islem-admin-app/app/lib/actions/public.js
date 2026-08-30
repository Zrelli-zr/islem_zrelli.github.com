"use server";

import { createClient } from "@/app/lib/supabase/server";
import { PAGE_SIZE } from "@/app/lib/constants";

// Read-only, no auth required — RLS already restricts this to
// published=true rows for anonymous visitors. This is what lets the
// public gallery handle thousands of photographs without ever loading
// them all into the browser at once.
export async function getPhotosPage(offset = 0) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  return { photos: data || [], hasMore: (data || []).length === PAGE_SIZE };
}
