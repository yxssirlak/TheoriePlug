create or replace function public.delete_flashcards_bulk(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Geen toegang tot flashcardbeheer.' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'Selecteer minimaal één flashcard.' using errcode = '22023';
  end if;
  delete from public.flashcards where id = any(p_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_flashcards_bulk(uuid[]) from public;
grant execute on function public.delete_flashcards_bulk(uuid[]) to authenticated;
