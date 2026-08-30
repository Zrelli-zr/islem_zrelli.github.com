import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use this everywhere you need to know "who is making this request".
// It reads the real session cookie, so it can't be spoofed by editing
// client-side JS — this is the actual security boundary, not the
// 5-tap gesture or the /admin URL.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no response to write to —
            // safe to ignore because middleware refreshes the session too.
          }
        },
      },
    }
  );
}

// Requires a real, currently-valid session. Throws if not authenticated.
// Every admin server action MUST call this first, before touching any
// data — this is what actually protects the admin APIs, independent of
// whatever the frontend does or doesn't show.
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("UNAUTHORIZED");
  }
  return { supabase, user };
}
