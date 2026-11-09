do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exam_save_definition(jsonb)'::regprocedure)
    into v_definition;
  if position($old$v_question_count < 44$old$ in v_definition) > 0 then
    v_definition := replace(v_definition,
      $old$v_question_count < 44$old$,
      $new$v_question_count < 1$new$);
    v_definition := replace(v_definition,
      $old$Een examen kan alleen worden gepubliceerd vanaf 44 vragen$old$,
      $new$Een examen kan alleen worden gepubliceerd met minimaal één vraag$new$);
  elsif position($new$v_question_count < 1$new$ in v_definition) = 0 then
    raise exception 'Onverwachte exam_save_definition-versie; slaaggrens-reparatie afgebroken';
  end if;
  execute v_definition;

  select pg_get_functiondef('public.exam_student_list()'::regprocedure)
    into v_definition;
  if position($old$'passing_score', e.passing_score,$old$ in v_definition) > 0 then
    v_definition := replace(v_definition,
      $old$'passing_score', e.passing_score,$old$,
      $new$'passing_score', ceil((select count(*) from public.questions q where q.exam_id = e.id) * 44.0 / 50.0)::integer,$new$);
  elsif position($new$'passing_score', ceil((select count(*) from public.questions q where q.exam_id = e.id) * 44.0 / 50.0)::integer,$new$ in v_definition) = 0 then
    raise exception 'Onverwachte exam_student_list-versie; slaaggrens-reparatie afgebroken';
  end if;
  execute v_definition;

  select pg_get_functiondef('public.exam_attempt_action(uuid,text,uuid,jsonb,jsonb,integer)'::regprocedure)
    into v_definition;
  if position($old$jsonb_array_length(v_questions) < 44$old$ in v_definition) > 0 then
    v_definition := replace(v_definition,
      $old$jsonb_array_length(v_questions) < 44$old$,
      $new$jsonb_array_length(v_questions) < 1$new$);
    v_definition := replace(v_definition,
      $old$Een gepubliceerd examen moet 44 tot 50 vragen bevatten$old$,
      $new$Een gepubliceerd examen moet 1 tot 50 vragen bevatten$new$);
    v_definition := replace(v_definition,
      $old$jsonb_array_length(v_questions), 44)$old$,
      $new$jsonb_array_length(v_questions), ceil(jsonb_array_length(v_questions) * 44.0 / 50.0)::integer)$new$);
  elsif position($new$jsonb_array_length(v_questions) < 1$new$ in v_definition) = 0 then
    raise exception 'Onverwachte exam_attempt_action-versie; slaaggrens-reparatie afgebroken';
  end if;
  execute v_definition;
end;
$migration$;
