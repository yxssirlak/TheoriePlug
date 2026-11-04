-- Videocursus & adaptief leersysteem.
-- Vervangt de eenvoudige courses/lessons-tabellen uit de vorige beheer-migratie (nog niet in gebruik).
drop table if exists public.lessons cascade;
drop table if exists public.courses cascade;

-- Toegang: actief betaald pakket, en of dat pakket adaptief (Boost/Max) is
create or replace function public.has_active_access()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_access
    where user_id = auth.uid() and payment_status = 'paid' and expires_at > now()
  );
$$;

create or replace function public.has_adaptive_access()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_access ua
    join public.packages p on p.id = ua.package_id
    where ua.user_id = auth.uid()
      and ua.payment_status = 'paid'
      and ua.expires_at > now()
      and lower(p.name) in ('boost', 'max')
  );
$$;

revoke all on function public.has_active_access() from public;
revoke all on function public.has_adaptive_access() from public;
grant execute on function public.has_active_access() to authenticated;
grant execute on function public.has_adaptive_access() to authenticated;

-- Leerlingen mogen hun eigen profiel en pakketten lezen (nodig om de tier te bepalen)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "packages_select_all" on public.packages;
create policy "packages_select_all" on public.packages for select to authenticated using (true);

drop policy if exists "user_access_select_own" on public.user_access;
create policy "user_access_select_own" on public.user_access for select to authenticated using (user_id = auth.uid());

-- 1. Hoofdonderwerpen
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  icon text,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Subonderwerpen
create table public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index subtopics_topic_id_idx on public.subtopics (topic_id);

-- 3. Videolessen
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  duration_seconds integer not null default 0,
  sort_order integer not null default 0,
  cheat_sheet_notes text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index lessons_subtopic_id_idx on public.lessons (subtopic_id);

-- 4. Kennis-check vragen na een video
create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  question text not null,
  image_url text,
  options text[] not null,
  correct_option integer not null,
  explanation text,
  topic_tag text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint lesson_questions_options_check check (array_length(options, 1) between 2 and 4),
  constraint lesson_questions_correct_check check (correct_option >= 0 and correct_option < array_length(options, 1))
);
create index lesson_questions_lesson_id_idx on public.lesson_questions (lesson_id);

-- Voortgang per leerling
create table public.user_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Beheersing per subonderwerp (0-100). Gevoed door post-video vragen en later oefenexamens.
create table public.user_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  subtopic_id uuid not null references public.subtopics (id) on delete cascade,
  attempts integer not null default 0,
  correct integer not null default 0,
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, subtopic_id)
);

alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_mastery enable row level security;

-- Inhoud: leerlingen met actief pakket lezen gepubliceerde lessen; beheerders alles
create policy "topics_read" on public.topics for select to authenticated
  using (public.has_active_access() or public.is_admin());
create policy "topics_admin_write" on public.topics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "subtopics_read" on public.subtopics for select to authenticated
  using (public.has_active_access() or public.is_admin());
create policy "subtopics_admin_write" on public.subtopics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "lessons_read" on public.lessons for select to authenticated
  using ((is_published and public.has_active_access()) or public.is_admin());
create policy "lessons_admin_write" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Vragen alleen voor Boost/Max (afdwingen in de database, niet alleen in de UI)
create policy "lesson_questions_read" on public.lesson_questions for select to authenticated
  using (public.has_adaptive_access() or public.is_admin());
create policy "lesson_questions_admin_write" on public.lesson_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Eigen voortgang en beheersing
create policy "user_progress_own" on public.user_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "user_mastery_own_read" on public.user_mastery for select to authenticated
  using (user_id = auth.uid());
create policy "user_mastery_own_write" on public.user_mastery for insert to authenticated
  with check (user_id = auth.uid() and public.has_adaptive_access());
create policy "user_mastery_own_update" on public.user_mastery for update to authenticated
  using (user_id = auth.uid() and public.has_adaptive_access())
  with check (user_id = auth.uid() and public.has_adaptive_access());
