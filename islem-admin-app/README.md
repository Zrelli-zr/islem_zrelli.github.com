# Islem Zrelli Portfolio — Site + Admin CMS

A Next.js site backed by Supabase (Postgres + Auth + Storage). The public
gallery keeps the original cinematic design; everything in it now comes
from the database instead of being hardcoded, and there's a real admin
dashboard behind a hidden entry point.

## How the security actually works

- The **"I. Z." mark** in the top-left corner is just a shortcut: tap it
  5 times within 2 seconds and it navigates to `/admin/login`. It is
  **not** what protects the admin area — it's only there so the login
  page isn't linked anywhere public.
- The real protection is `middleware.js`, which runs on the server for
  every request to `/admin/*` and checks a genuine Supabase session
  cookie. If there's no valid session, it redirects to the login page —
  no matter how someone reaches the URL.
- Every admin **server action** (in `app/lib/actions/`) independently
  calls `requireAdmin()` again before touching the database. So even if
  someone found a way to render an admin page, the underlying writes
  are still blocked without a real session.
- **Row Level Security (RLS)** in Postgres is the third layer: even if
  someone bypassed the app entirely and hit Supabase directly, anonymous
  requests can only read `published = true` rows, never write anything.
- There is no public sign-up. You create your own login by hand in the
  Supabase dashboard (see below), so "authenticated" effectively means
  "Islem."

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's ready, open **SQL Editor** and run the contents of
   `supabase/migration.sql` from this project. This creates all tables,
   RLS policies, the three storage buckets (`photos`, `covers`, `about`),
   and the `increment_photo_stat` function used for like/share counts.
3. Open **Storage** and confirm the three buckets exist and are marked
   **Public** (the migration does this, but it's worth checking).

## 2. Create your admin login

Supabase Auth handles this — you don't need a signup page because there
should only ever be one admin account:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**.
2. Enter your email and a password. Confirm the email if prompted.
3. That's it — this is the account you'll use to sign in at `/admin/login`.

Do **not** enable public sign-ups in Authentication settings.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the two values from
**Supabase → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Both are safe to expose in the browser — the anon key only ever grants
what RLS allows.

## 4. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. To reach the admin login, tap the small
"I. Z." mark in the top-left corner 5 times quickly, or just go directly
to `/admin/login`.

## 5. Add your first content

The site will look empty until you add data:

1. Sign in at `/admin/login`.
2. **Categories** — add your categories (All Work, Environment, Gabès,
   People, Activism, Landscapes, Travel, Portraits, Film, or whatever
   you want — fully editable later).
3. **Photographs** — upload a few, mark them **Published**.
4. **About** — fill in your bio, achievements, socials, contact info.
5. **Projects** — optional; group photographs into a project gallery.

## 6. Deploy

The easiest path is [Vercel](https://vercel.com) (made by the Next.js team):

1. Push this project to a GitHub repo.
2. In Vercel, "New Project" → import that repo.
3. Add the two environment variables from step 3 in the Vercel project
   settings.
4. Deploy. Vercel gives you a URL immediately; you can attach your own
   domain afterward in Project Settings → Domains.

## Notes on what's simplified (and why)

- **Reordering** uses up/down buttons rather than drag-and-drop. It's
  less flashy but far more reliable across devices, and just as fast
  for a few hundred items.
- **Thumbnails** are generated in the browser via canvas at upload time
  (no server image-processing service needed). The original is also
  stored, so nothing is lost.
- **Likes** are a one-way counter (like Instagram-style totals), not a
  toggleable like/unlike — this matches what "see likes" as an
  analytics figure implies, and avoids a visitor inflating/deflating
  counts by toggling repeatedly.
- **Achievements / festivals / publications / collaborations** are
  simple editable text lists rather than separate structured tables —
  simpler to manage for content that's really just a list of lines.

If you outgrow any of these later (e.g. you want true drag-and-drop
reordering, or richer project credit fields), they're straightforward
additions to the existing structure.
