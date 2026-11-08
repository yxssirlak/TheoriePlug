alter table public.cheat_sheet_pages
  add column chapter_number integer check (chapter_number is null or chapter_number >= 0);
