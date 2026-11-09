alter table public.questions drop constraint questions_question_type_check;
alter table public.questions add constraint questions_question_type_check
  check (question_type in ('multiple_choice', 'yes_no', 'multiple_response', 'number', 'ordering', 'single_drag', 'hotspot'));

-- Preserve the existing access checks, snapshot handling and deadline logic while extending their type-specific branches.
do $migration$
declare
  source text;
  updated text;
begin
  select pg_get_functiondef('public.exam_attempt_action(uuid,text,uuid,jsonb,jsonb,integer)'::regprocedure) into source;
  updated := replace(source,
    $old$if v_question->>'question_type' = 'multiple_choice' then$old$,
    $new$if v_question->>'question_type' in ('multiple_choice', 'yes_no', 'single_drag', 'hotspot') then$new$);
  if updated = source then raise exception 'Kan antwoordvalidatie niet bijwerken'; end if;
  source := updated;
  updated := replace(source,
    $old$      elsif v_question->>'question_type' = 'number' then$old$,
    $new$      elsif v_question->>'question_type' = 'multiple_response' then
        if jsonb_typeof(v_value) is distinct from 'array' then
          raise exception 'Ongeldige antwoorden';
        end if;
        if jsonb_array_length(v_value) > jsonb_array_length(v_question->'options')
          or (select count(distinct value) from jsonb_array_elements(v_value)) <> jsonb_array_length(v_value)
          or exists (select 1 from jsonb_array_elements(v_value) a
            where jsonb_typeof(a) <> 'string'
              or not exists (select 1 from jsonb_array_elements(v_question->'options') o where o->>'id' = a#>>'{}')) then
          raise exception 'Ongeldige antwoorden';
        end if;
      elsif v_question->>'question_type' = 'number' then$new$);
  if updated = source then raise exception 'Kan multiple-responsevalidatie niet toevoegen'; end if;
  execute updated;

  select pg_get_functiondef('public.exam_finalize_attempt(uuid)'::regprocedure) into source;
  updated := replace(source,
    $old$if v_question->>'question_type' = 'multiple_choice' then$old$,
    $new$if v_question->>'question_type' in ('multiple_choice', 'yes_no', 'single_drag', 'hotspot') then$new$);
  if updated = source then raise exception 'Kan puntentelling niet bijwerken'; end if;
  source := updated;
  updated := replace(source,
    $old$    elsif v_question->>'question_type' = 'number' then$old$,
    $new$    elsif v_question->>'question_type' = 'multiple_response' then
      if jsonb_typeof(v_answer) = 'array' then
        v_result := jsonb_array_length(v_answer) > 0
          and jsonb_array_length(v_answer) = (select count(*) from jsonb_array_elements(v_question->'options') o where (o->>'is_correct')::boolean)
          and not exists (select 1 from jsonb_array_elements(v_question->'options') o
            where (o->>'is_correct')::boolean and not (v_answer ? (o->>'id')));
      end if;
    elsif v_question->>'question_type' = 'number' then$new$);
  if updated = source then raise exception 'Kan multiple-responsepuntentelling niet toevoegen'; end if;
  execute updated;
end;
$migration$;
