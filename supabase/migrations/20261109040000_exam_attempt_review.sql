create or replace function public.exam_attempt_review(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_questions jsonb;
begin
  if auth.uid() is null then raise exception 'Log eerst in'; end if;

  select s.questions into v_questions
  from public.exam_attempts a
  join public.exam_attempt_snapshots s on s.attempt_id = a.id
  where a.id = p_attempt_id
    and a.user_id = auth.uid()
    and a.status = 'completed'
    and public.can_access_exam(a.exam_id);

  if not found then raise exception 'Afgeronde examenpoging niet gevonden'; end if;
  return v_questions;
end;
$$;

revoke all on function public.exam_attempt_review(uuid) from public, anon;
grant execute on function public.exam_attempt_review(uuid) to authenticated;
