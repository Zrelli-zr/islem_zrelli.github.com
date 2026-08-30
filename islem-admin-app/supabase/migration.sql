-- ============================================================
-- Islem Zrelli Portfolio — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- categories ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- photographs ----------
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  thumb_url text,
  title text not null default '',
  story text not null default '',
  category_id uuid references categories(id) on delete set null,
  location text,
  photo_date date,
  alt_text text not null default '',
  likes int not null default 0,
  shares int not null default 0,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists photos_published_idx on photos (published, sort_order);
create index if not exists photos_category_idx on photos (category_id);

-- ---------- projects ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  cover_url text,
  year text,
  location text,
  role text,
  video_url text,
  credits text,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- project <-> photo galleries (many-to-many) ----------
create table if not exists project_photos (
  project_id uuid references projects(id) on delete cascade,
  photo_id uuid references photos(id) on delete cascade,
  sort_order int not null default 0,
  primary key (project_id, photo_id)
);

-- ---------- about (single row) ----------
create table if not exists about (
  id int primary key default 1,
  name text not null default '',
  short_bio text not null default '',
  long_bio text not null default '',
  profile_photo_url text,
  areas_of_work jsonb not null default '[]',
  achievements jsonb not null default '[]',
  festivals jsonb not null default '[]',
  publications jsonb not null default '[]',
  collaborations jsonb not null default '[]',
  social_links jsonb not null default '[]',
  contact_email text,
  contact_phone text,
  updated_at timestamptz not null default now(),
  constraint about_singleton check (id = 1)
);
insert into about (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- Public (anon) visitors: read-only, published content only.
-- Any authenticated user (only Islem will have an account —
-- do NOT enable public sign-up in Supabase Auth settings) has
-- full read/write. This is enough for a single-admin site.
-- ============================================================

alter table categories enable row level security;
alter table photos enable row level security;
alter table projects enable row level security;
alter table project_photos enable row level security;
alter table about enable row level security;

-- categories: public read, admin write
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- photos: public can only see published rows; admin sees/edits everything
create policy "photos_public_read" on photos for select using (published = true);
create policy "photos_admin_all" on photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- projects
create policy "projects_public_read" on projects for select using (published = true);
create policy "projects_admin_all" on projects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- project_photos: readable if the parent project is published
create policy "project_photos_public_read" on project_photos for select using (
  exists (select 1 from projects p where p.id = project_id and p.published = true)
);
create policy "project_photos_admin_all" on project_photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- about: public read, admin write
create policy "about_public_read" on about for select using (true);
create policy "about_admin_write" on about for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage buckets
-- Create these in Supabase Dashboard -> Storage (or run below if
-- the storage extension is available in the SQL editor):
--   photos   (public)
--   covers   (public)   -- project covers
--   about    (public)   -- profile photo
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('about', 'about', true) on conflict (id) do nothing;

create policy "storage_public_read" on storage.objects for select using (
  bucket_id in ('photos', 'covers', 'about')
);
create policy "storage_admin_write" on storage.objects for insert with check (
  bucket_id in ('photos', 'covers', 'about') and auth.role() = 'authenticated'
);
create policy "storage_admin_update" on storage.objects for update using (
  bucket_id in ('photos', 'covers', 'about') and auth.role() = 'authenticated'
);
create policy "storage_admin_delete" on storage.objects for delete using (
  bucket_id in ('photos', 'covers', 'about') and auth.role() = 'authenticated'
);

-- ============================================================
-- Atomic counters for likes/shares (avoid race conditions from
-- read-then-write increments across concurrent visitors).
-- ============================================================
create or replace function increment_photo_stat(p_id uuid, p_field text)
returns void as $$
begin
  if p_field = 'likes' then
    update photos set likes = likes + 1 where id = p_id;
  elsif p_field = 'shares' then
    update photos set shares = shares + 1 where id = p_id;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function increment_photo_stat(uuid, text) to anon, authenticated;
