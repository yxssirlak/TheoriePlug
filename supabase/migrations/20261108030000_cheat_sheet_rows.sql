alter table public.cheat_sheet_pages
  add column sheet_rows jsonb check (sheet_rows is null or jsonb_typeof(sheet_rows) = 'array');
