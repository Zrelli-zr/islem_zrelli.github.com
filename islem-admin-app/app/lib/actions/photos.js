"use server";

import { requireAdmin } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPhoto(fields) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("photos")
    .insert({
      image_url: fields.image_url,
      thumb_url: fields.thumb_url,
      title: fields.title || "",
      story: fields.story || "",
      category_id: fields.category_id || null,
      location: fields.location || null,
      photo_date: fields.photo_date || null,
      alt_text: fields.alt_text || "",
      published: !!fields.published,
      featured: !!fields.featured,
      sort_order: fields.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/photos");
  revalidatePath("/");
  return data;
}

export async function updatePhoto(id, fields) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("photos")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/photos");
  revalidatePath("/");
}

export async function deletePhoto(id) {
  const { supabase } = await requireAdmin();
  // Look up storage paths first so we can clean up the files too.
  const { data: photo } = await supabase
    .from("photos")
    .select("image_url, thumb_url")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw error;

  if (photo) {
    const paths = [photo.image_url, photo.thumb_url]
      .filter(Boolean)
      .map((url) => url.split("/photos/").pop())
      .filter(Boolean);
    if (paths.length) await supabase.storage.from("photos").remove(paths);
  }

  revalidatePath("/admin/photos");
  revalidatePath("/");
}

export async function togglePublished(id, published) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("photos").update({ published }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/photos");
  revalidatePath("/");
}

export async function toggleFeatured(id, featured) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("photos").update({ featured }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/photos");
  revalidatePath("/");
}

// Simple, reliable reordering: pass the full ordered list of photo IDs
// for the current view and we persist their new sort_order values.
export async function reorderPhotos(orderedIds) {
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("photos").update({ sort_order: index }).eq("id", id)
    )
  );
  revalidatePath("/admin/photos");
  revalidatePath("/");
}

// Public-facing (no auth required) — anyone visiting the site can like/
// share, but it only ever increments a counter via a locked-down SQL
// function, it can't be used to read/write anything else.
export async function incrementPhotoStat(id, field) {
  if (field !== "likes" && field !== "shares") throw new Error("Invalid field");
  const { createClient } = await import("@/app/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_photo_stat", { p_id: id, p_field: field });
  if (error) throw error;
}
