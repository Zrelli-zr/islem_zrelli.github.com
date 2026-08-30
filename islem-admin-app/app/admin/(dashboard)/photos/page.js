import { createClient } from "@/app/lib/supabase/server";
import PhotosManager from "./PhotosManager";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const supabase = createClient();
  const [{ data: photos }, { data: categories }] = await Promise.all([
    supabase.from("photos").select("*").order("sort_order", { ascending: true }),
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <>
      <h1>Photographs</h1>
      <PhotosManager initialPhotos={photos || []} categories={categories || []} />
    </>
  );
}
