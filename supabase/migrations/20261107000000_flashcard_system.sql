create table public.flashcard_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (length(trim(slug)) > 0),
  sort_order integer not null default 0,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.flashcards
  add column category_id uuid references public.flashcard_categories (id) on delete restrict,
  add column image_url text,
  add column explanation text;

-- Bewaar ook kaarten zonder bestaande categorie en categorieën met dezelfde naam maar andere schrijfwijze.
insert into public.flashcard_categories (name, slug)
select name, 'bestaand-' || gen_random_uuid()::text
from (
  select distinct coalesce(nullif(trim(category), ''), 'Overig') as name
  from public.flashcards
) categories;

update public.flashcards f
set category_id = c.id
from public.flashcard_categories c
where c.name = coalesce(nullif(trim(f.category), ''), 'Overig');

alter table public.flashcards alter column category_id set not null;
create index flashcards_category_id_idx on public.flashcards (category_id);

create table public.user_flashcard_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  mastery_level text not null check (mastery_level in ('hard', 'doubt', 'mastered')),
  last_reviewed_at timestamptz not null default now(),
  primary key (user_id, flashcard_id)
);

alter table public.flashcard_categories enable row level security;
alter table public.user_flashcard_progress enable row level security;

create policy "flashcard_categories_read" on public.flashcard_categories
  for select to authenticated using (public.has_active_access() or public.is_admin());
create policy "flashcard_categories_admin_write" on public.flashcard_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "flashcard_progress_read_own" on public.user_flashcard_progress
  for select to authenticated using (user_id = auth.uid());
create policy "flashcard_progress_insert_own" on public.user_flashcard_progress
  for insert to authenticated with check (
    user_id = auth.uid()
    and (public.has_active_access() or public.is_admin())
    and exists (select 1 from public.flashcards where id = flashcard_id and is_published)
  );
create policy "flashcard_progress_update_own" on public.user_flashcard_progress
  for update to authenticated using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (public.has_active_access() or public.is_admin())
    and exists (select 1 from public.flashcards where id = flashcard_id and is_published)
  );
