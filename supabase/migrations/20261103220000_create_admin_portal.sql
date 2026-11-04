-- Lijst met geautoriseerde beheerders (medewerkers)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Alleen lezen van je eigen rij; toevoegen/verwijderen kan alleen via de SQL editor (service role)
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Cursussen
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lessen binnen een cursus (tekst, video en foto's)
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  body text,
  video_url text,
  image_urls text[] not null default '{}',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_course_id_idx on public.lessons (course_id);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;

drop policy if exists "courses_read_published" on public.courses;
create policy "courses_read_published" on public.courses
  for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write" on public.courses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lessons_read_published" on public.lessons;
create policy "lessons_read_published" on public.lessons
  for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Opslag voor foto's en video's
insert into storage.buckets (id, name, public)
values ('course-media', 'course-media', true)
on conflict (id) do nothing;

drop policy if exists "course_media_public_read" on storage.objects;
create policy "course_media_public_read" on storage.objects
  for select using (bucket_id = 'course-media');

drop policy if exists "course_media_admin_insert" on storage.objects;
create policy "course_media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-media' and public.is_admin());

drop policy if exists "course_media_admin_update" on storage.objects;
create policy "course_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-media' and public.is_admin());

drop policy if exists "course_media_admin_delete" on storage.objects;
create policy "course_media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-media' and public.is_admin());

-- Een beheerder toevoegen (pas het e-mailadres aan; het account moet al bestaan):
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'medewerker@theorieplug.nl';
