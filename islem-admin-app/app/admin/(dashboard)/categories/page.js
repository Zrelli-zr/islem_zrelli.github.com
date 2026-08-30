import { createClient } from "@/app/lib/supabase/server";
import CategoriesManager from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <h1>Categories</h1>
      <CategoriesManager initialCategories={categories || []} />
    </>
  );
}
