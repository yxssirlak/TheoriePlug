create or replace function public.enforce_integrated_exam_limits()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_exam_ids uuid[];
  v_exam_id uuid;
  v_is_published boolean;
  v_question_count integer;
begin
  if tg_table_name = 'exams' then
    if not new.is_published then return null; end if;
    v_exam_ids := array[new.id];
  elsif tg_op = 'DELETE' then
    v_exam_ids := array[old.exam_id];
  elsif tg_op = 'UPDATE' and old.exam_id is distinct from new.exam_id then
    v_exam_ids := array[old.exam_id, new.exam_id];
  else
    v_exam_ids := array[new.exam_id];
  end if;

  foreach v_exam_id in array v_exam_ids loop
    select is_published into v_is_published
    from public.exams where id = v_exam_id for update;
    if not found then continue; end if;

    select count(*) into v_question_count
    from public.questions where exam_id = v_exam_id;

    if v_question_count > 50 then
      raise exception 'Een examen kan maximaal 50 vragen bevatten';
    end if;
    if v_is_published and v_question_count < 1 then
      raise exception 'Een gepubliceerd examen heeft minimaal één vraag nodig';
    end if;
  end loop;
  return null;
end;
$$;
