"use server";

import { requireAdmin } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAbout(fields) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("about")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/admin/about");
  revalidatePath("/");
}
