create or replace function public.reset_flashcard_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not (public.has_active_access() or public.is_admin()) then
    raise exception 'Geen toegang tot flashcards.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.flashcard_categories where id = p_category_id) then
    raise exception 'Onderwerp bestaat niet.' using errcode = '22023';
  end if;

  delete from public.user_flashcard_progress p
  using public.flashcards f
  where p.flashcard_id = f.id
    and p.user_id = auth.uid()
    and f.category_id = p_category_id;
end;
$$;

revoke all on function public.reset_flashcard_category(uuid) from public;
grant execute on function public.reset_flashcard_category(uuid) to authenticated;
