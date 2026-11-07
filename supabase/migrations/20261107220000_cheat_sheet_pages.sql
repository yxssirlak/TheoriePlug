create table public.cheat_sheet_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  accent_color text not null default '#a3e635' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null default '#ffffff' check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text not null default '#17221d' check (text_color ~ '^#[0-9a-fA-F]{6}$'),
  header_text_color text not null default '#17221d' check (header_text_color ~ '^#[0-9a-fA-F]{6}$'),
  columns integer not null default 2 check (columns between 1 and 3),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cheat_sheet_pages enable row level security;
create policy "cheat_sheet_pages_read" on public.cheat_sheet_pages for select to authenticated
  using ((is_published and public.has_active_access()) or public.is_admin());
create policy "cheat_sheet_pages_admin_write" on public.cheat_sheet_pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cheat-sheet-media', 'cheat-sheet-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cheat_sheet_media_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'cheat-sheet-media' and (
      public.is_admin() or (
        public.has_active_access() and exists (
          select 1 from public.cheat_sheet_pages p
          where p.id::text = (storage.foldername(name))[1] and p.is_published
            and exists (
              select 1 from jsonb_array_elements(p.blocks) block
              where block->>'image_path' = storage.objects.name
            )
        )
      )
    )
  );
create policy "cheat_sheet_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'cheat-sheet-media' and public.is_admin());
create policy "cheat_sheet_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cheat-sheet-media' and public.is_admin());
