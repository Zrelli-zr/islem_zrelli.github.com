import { createClient } from "@/app/lib/supabase/server";
import { PAGE_SIZE } from "@/app/lib/constants";
import Gallery from "@/app/components/Gallery";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: firstPage }, { count }, { data: about }] = await Promise.all([
    supabase
      .from("photos")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .range(0, PAGE_SIZE - 1),
    supabase.from("photos").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("about").select("*").eq("id", 1).single(),
  ]);

  return (
    <Gallery
      initialPhotos={firstPage || []}
      hasMoreInitial={(firstPage || []).length === PAGE_SIZE}
      totalCount={count || 0}
      about={about}
    />
  );
}
