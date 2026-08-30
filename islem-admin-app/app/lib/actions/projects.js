"use server";

import { requireAdmin } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(fields) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: fields.title || "Untitled project",
      description: fields.description || "",
      cover_url: fields.cover_url || null,
      year: fields.year || null,
      location: fields.location || null,
      role: fields.role || null,
      video_url: fields.video_url || null,
      credits: fields.credits || null,
      published: !!fields.published,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/admin/projects");
  revalidatePath("/");
  return data;
}

export async function updateProject(id, fields) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("projects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function deleteProject(id) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function togglePublishedProject(id, published) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("projects").update({ published }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function reorderProjects(orderedIds) {
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("projects").update({ sort_order: index }).eq("id", id)
    )
  );
  revalidatePath("/admin/projects");
}

export async function setProjectGallery(projectId, photoIds) {
  const { supabase } = await requireAdmin();
  await supabase.from("project_photos").delete().eq("project_id", projectId);
  if (photoIds.length) {
    const rows = photoIds.map((photo_id, index) => ({
      project_id: projectId,
      photo_id,
      sort_order: index,
    }));
    const { error } = await supabase.from("project_photos").insert(rows);
    if (error) throw error;
  }
  revalidatePath("/admin/projects");
  revalidatePath("/");
}
