"use server";

import { requireAdmin } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCategory(name) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .insert({ name, slug: slugify(name) });
  if (error) throw error;
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function renameCategory(id, name) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .update({ name, slug: slugify(name) })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategory(id) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function reorderCategories(orderedIds) {
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("categories").update({ sort_order: index }).eq("id", id)
    )
  );
  revalidatePath("/admin/categories");
}
