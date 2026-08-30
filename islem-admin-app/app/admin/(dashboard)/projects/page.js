import { createClient } from "@/app/lib/supabase/server";
import ProjectsManager from "./ProjectsManager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createClient();
  const [{ data: projects }, { data: photos }, { data: galleries }] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order", { ascending: true }),
    supabase.from("photos").select("id, title, thumb_url, image_url").order("sort_order", { ascending: true }),
    supabase.from("project_photos").select("project_id, photo_id, sort_order").order("sort_order", { ascending: true }),
  ]);

  return (
    <>
      <h1>Projects</h1>
      <ProjectsManager
        initialProjects={projects || []}
        allPhotos={photos || []}
        initialGalleries={galleries || []}
      />
    </>
  );
}
