import { createClient } from "@/app/lib/supabase/server";
import AboutManager from "./AboutManager";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const supabase = createClient();
  const { data: about } = await supabase.from("about").select("*").eq("id", 1).single();

  return (
    <>
      <h1>About page content</h1>
      <AboutManager initialAbout={about} />
    </>
  );
}
