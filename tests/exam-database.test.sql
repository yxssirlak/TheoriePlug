-- Alle fixtures en wijzigingen worden aan het einde van deze test teruggedraaid.
begin;
create temporary table exam_test_ids (admin_id uuid, student_id uuid, other_id uuid, unauthorized_id uuid, exam_id uuid, q1 uuid, q2 uuid, q3 uuid, o1 uuid, o2 uuid, o3 uuid, o4 uuid, o5 uuid);
insert into exam_test_ids select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid();
grant select on exam_test_ids to authenticated;
insert into auth.users(id) select admin_id from exam_test_ids union all select student_id from exam_test_ids union all select other_id from exam_test_ids union all select unauthorized_id from exam_test_ids;
insert into public.profiles(id) select student_id from exam_test_ids union all select other_id from exam_test_ids union all select unauthorized_id from exam_test_ids;
insert into public.admins(user_id, email) select admin_id, admin_id::text || '@example.invalid' from exam_test_ids;
insert into public.user_access(user_id, package_id, payment_status, expires_at)
select student_id, (select id from public.packages where lower(name) = 'start' limit 1), 'paid', now() + interval '1 day' from exam_test_ids;
insert into public.user_access(user_id, package_id, payment_status, expires_at)
select other_id, (select id from public.packages where lower(name) = 'start' limit 1), 'paid', now() + interval '1 day' from exam_test_ids;
set local role authenticated;
do $$
declare
  t record; d jsonb; d_invalid jsonb; a jsonb; b jsonb; answer jsonb; review jsonb; failed boolean;
begin
  select * into t from exam_test_ids;
  perform set_config('request.jwt.claim.sub', t.admin_id::text, true);
  d := jsonb_build_object('id', t.exam_id, 'title', 'Test', 'description', '', 'time_limit_minutes', 30,
    'passing_score', 44, 'allowed_packages', jsonb_build_array('start'), 'is_published', true, 'questions',
    jsonb_build_array(
      jsonb_build_object('id', t.q1, 'question_text', 'Keuze', 'question_type', 'multiple_choice', 'image_url', null, 'correct_number', null, 'explanation', 'Keuze uitleg',
        'options', jsonb_build_array(
          jsonb_build_object('id', t.o1, 'option_text', 'A', 'image_url', null, 'is_correct', true, 'coordinates_x', null, 'coordinates_y', null, 'correct_order', null),
          jsonb_build_object('id', t.o2, 'option_text', 'B', 'image_url', null, 'is_correct', false, 'coordinates_x', null, 'coordinates_y', null, 'correct_order', null))),
      jsonb_build_object('id', t.q2, 'question_text', 'Getal', 'question_type', 'number', 'image_url', null, 'correct_number', 50, 'explanation', '', 'options', '[]'::jsonb),
      jsonb_build_object('id', t.q3, 'question_text', 'Volgorde', 'question_type', 'ordering', 'image_url', t.exam_id::text || '/test', 'correct_number', null, 'explanation', '',
        'options', jsonb_build_array(
          jsonb_build_object('id', t.o3, 'option_text', '', 'image_url', null, 'is_correct', false, 'coordinates_x', 10, 'coordinates_y', 10, 'correct_order', 1),
          jsonb_build_object('id', t.o4, 'option_text', '', 'image_url', null, 'is_correct', false, 'coordinates_x', 20, 'coordinates_y', 20, 'correct_order', 2),
          jsonb_build_object('id', t.o5, 'option_text', '', 'image_url', null, 'is_correct', false, 'coordinates_x', 30, 'coordinates_y', 30, 'correct_order', 3))))
    || (select jsonb_agg(jsonb_build_object(
      'id', gen_random_uuid(), 'question_text', 'Extra vraag ' || n, 'question_type', 'multiple_choice',
      'image_url', null, 'correct_number', null, 'explanation', '',
      'options', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'option_text', 'A', 'image_url', null, 'is_correct', true,
          'coordinates_x', null, 'coordinates_y', null, 'correct_order', null),
        jsonb_build_object('id', gen_random_uuid(), 'option_text', 'B', 'image_url', null, 'is_correct', false,
          'coordinates_x', null, 'coordinates_y', null, 'correct_order', null)
      )
    )) from generate_series(1, 41) n));
  perform public.exam_save_definition(d);
  if jsonb_array_length(public.exam_admin_definition(t.exam_id)->'questions') <> 44
    or public.exam_admin_definition(t.exam_id)->>'passing_score' <> '44'
    or public.exam_admin_definition(t.exam_id)->>'time_limit_minutes' <> '30' then
    raise exception 'Admin laden of vaste examenscore mislukt';
  end if;
  d_invalid := jsonb_set(d, '{questions}', jsonb_build_array(d->'questions'->0));
  perform public.exam_save_definition(d_invalid);
  set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  set constraints exams_integrated_question_limits, questions_integrated_question_limits deferred;
  if jsonb_array_length(public.exam_admin_definition(t.exam_id)->'questions') <> 1
    or public.exam_admin_definition(t.exam_id)->>'is_published' <> 'true' then
    raise exception 'Gepubliceerd examen met één vraag mislukt';
  end if;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  a := public.exam_student_list()->0;
  if (a->>'passing_score')::int <> 1 then
    raise exception 'Slaaggrens in de examenlijst voor één vraag klopt niet: %', a;
  end if;
  a := public.exam_attempt_action(t.exam_id, 'start');
  if (a->>'passing_score')::int <> 1 or (a->>'question_count')::int <> 1 then
    raise exception 'Dynamische slaaggrens voor één vraag mislukt: %', a;
  end if;
  b := public.exam_attempt_action(t.exam_id, 'submit', (a->>'id')::uuid,
    jsonb_build_object(t.q1::text, t.o1::text), '[]', 0);
  if b->>'status' <> 'completed' or (b->>'score')::int <> 1 or (b->>'passing_score')::int <> 1 then
    raise exception 'Beoordeling voor één vraag mislukt: %', b;
  end if;
  perform set_config('request.jwt.claim.sub', t.admin_id::text, true);
  perform public.exam_save_definition(d);
  d_invalid := jsonb_set(d, '{questions}', jsonb_build_array(d->'questions'->0, d->'questions'->1));
  perform public.exam_save_definition(d_invalid);
  set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  set constraints exams_integrated_question_limits, questions_integrated_question_limits deferred;
  d_invalid := jsonb_set(d, '{questions}', (
    select jsonb_agg(value) from jsonb_array_elements(d->'questions') with ordinality where ordinality <= 43
  ));
  perform public.exam_save_definition(d_invalid);
  set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  set constraints exams_integrated_question_limits, questions_integrated_question_limits deferred;
  if public.exam_admin_definition(t.exam_id)->>'is_published' <> 'true' then
    raise exception 'Gepubliceerd examen met 43 vragen mislukt';
  end if;
  perform public.exam_save_definition(d);
  d_invalid := jsonb_set(d, '{questions}', d->'questions' || jsonb_build_array(
    d->'questions'->0, d->'questions'->0, d->'questions'->0, d->'questions'->0, d->'questions'->0,
    d->'questions'->0, d->'questions'->0
  ));
  failed := false;
  begin perform public.exam_save_definition(d_invalid); exception when others then failed := true; end;
  if not failed then raise exception 'Examen met meer dan 50 vragen kon worden opgeslagen'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'questions' and column_name in ('cbr_category', 'time_limit_seconds')) then
    raise exception 'Verouderde vraagcategorie of vraag-timer bestaat nog';
  end if;
  perform set_config('request.jwt.claim.sub', t.unauthorized_id::text, true);
  failed := false;
  begin perform public.exam_attempt_action(t.exam_id, 'start'); exception when others then failed := true; end;
  if not failed then raise exception 'Niet-betalende leerling kreeg toegang'; end if;
  failed := false;
  begin perform public.exam_save_definition(d); exception when others then failed := true; end;
  if not failed then raise exception 'Leerling kreeg beheerrechten'; end if;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  if exists(select 1 from public.questions where exam_id = t.exam_id) or exists(select 1 from public.question_options where id = t.o1) then raise exception 'Correcte antwoorden zijn zichtbaar via RLS'; end if;
  a := public.exam_attempt_action(t.exam_id, 'start');
  if a::text ~ '"(is_correct|correct_order|correct_number|explanation)"' then raise exception 'Antwoorden lekken in actieve poging'; end if;
  failed := false;
  begin perform public.exam_attempt_review((a->>'id')::uuid); exception when others then failed := true; end;
  if not failed then raise exception 'Nakijken van actieve poging toegestaan'; end if;
  if a::text ~ '"(cbr_category|time_limit_seconds)"' then
    raise exception 'Verouderde vraagcategorie of vraag-timer lekt naar leerlingvraag';
  end if;
  if (public.exam_attempt_action(t.exam_id, 'start')->>'id') <> a->>'id' then raise exception 'Hervatten mislukt'; end if;
  if exists(select 1 from public.exam_attempt_snapshots where attempt_id = (a->>'id')::uuid) then raise exception 'Momentopname zichtbaar'; end if;
  answer := jsonb_build_object(t.q1::text, t.o1::text, t.q2::text, '50,0', t.q3::text,
    jsonb_build_object(t.o3::text, 1, t.o4::text, 2, t.o5::text, 3));
  b := public.exam_attempt_action(t.exam_id, 'save', (a->>'id')::uuid, answer, jsonb_build_array(t.q1), 0);
  if (b->>'revision')::int <> 1 then raise exception 'Opslaan mislukt'; end if;
  failed := false;
  begin perform public.exam_attempt_action(t.exam_id, 'save', (a->>'id')::uuid, answer, '[]', 0); exception when others then failed := true; end;
  if not failed then raise exception 'Verouderde versie geaccepteerd'; end if;
  perform set_config('request.jwt.claim.sub', t.admin_id::text, true);
  d := jsonb_set(d, '{questions,1,correct_number}', '51');
  perform public.exam_save_definition(d);
  perform set_config('request.jwt.claim.sub', t.other_id::text, true);
  failed := false;
  begin perform public.exam_attempt_action(t.exam_id, 'get', (a->>'id')::uuid); exception when others then failed := true; end;
  if not failed then raise exception 'Poging van andere leerling toegankelijk'; end if;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  b := public.exam_attempt_action(t.exam_id, 'submit', (a->>'id')::uuid, answer, jsonb_build_array(t.q1), 1);
  if b->>'status' <> 'completed' or (b->>'score')::int <> 3 or (b->>'passing_score')::int <> 39 then raise exception 'Beoordeling of momentopname mislukt: %', b; end if;
  if jsonb_array_length(b->'result') <> 44 then raise exception 'Resultaat ontbreekt'; end if;
  review := public.exam_attempt_review((a->>'id')::uuid);
  if jsonb_array_length(review) <> 44
    or review->0->'options'->0->>'is_correct' <> 'true'
    or review->0->>'explanation' <> 'Keuze uitleg'
    or review->1->>'correct_number' <> '50'
    or review->2->'options'->0->>'correct_order' <> '1' then
    raise exception 'Nakijken geeft niet de oorspronkelijke vragen en antwoorden terug';
  end if;
  perform set_config('request.jwt.claim.sub', t.other_id::text, true);
  failed := false;
  begin perform public.exam_attempt_review((a->>'id')::uuid); exception when others then failed := true; end;
  if not failed then raise exception 'Nakijken van poging van andere leerling toegestaan'; end if;
  perform set_config('request.jwt.claim.sub', t.unauthorized_id::text, true);
  failed := false;
  begin perform public.exam_attempt_review((a->>'id')::uuid); exception when others then failed := true; end;
  if not failed then raise exception 'Nakijken zonder toegang toegestaan'; end if;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  a := public.exam_attempt_action(t.exam_id, 'start');
  perform public.exam_attempt_action(t.exam_id, 'save', (a->>'id')::uuid, jsonb_build_object(t.q1::text, t.o1::text), '[]', 0);
end;
$$;
reset role;
update public.exam_attempts set started_at = now() - interval '2 minutes', deadline_at = now() - interval '1 minute'
  where user_id = (select student_id from exam_test_ids) and status = 'in_progress';
do $$ begin
  if public.exam_finalize_expired() <> 1 then raise exception 'Geplande afronding mislukt'; end if;
end; $$;
set local role authenticated;
do $$
declare t record; a jsonb; b jsonb; failed boolean;
begin
  select * into t from exam_test_ids;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  select public.exam_attempt_action(t.exam_id, 'get', id) into a from public.exam_attempts
    where exam_id = t.exam_id and user_id = t.student_id and status = 'completed' order by started_at limit 1;
  if a->>'status' <> 'completed' or (a->>'score')::int <> 1 then raise exception 'Automatisch inleveren mislukt'; end if;
  b := public.exam_attempt_action(t.exam_id, 'submit', (a->>'id')::uuid,
    jsonb_build_object(t.q1::text, t.o2::text), '[]', 999);
  if (b->>'score')::int <> 1 then raise exception 'Score van ingeleverde poging kon veranderen'; end if;
  failed := false;
  begin
    update public.exam_attempts set score = 3 where id = (a->>'id')::uuid;
    if found then raise exception 'Directe scorewijziging toegestaan'; end if;
  exception when insufficient_privilege then failed := true;
  end;
end;
$$;
reset role;
do $$
declare
  v_exam_id uuid;
  v_rejected boolean;
begin
  select exam_id into v_exam_id from exam_test_ids;
  v_rejected := false;
  begin
    delete from public.questions where exam_id = v_exam_id;
    set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  exception when raise_exception then
    if sqlerrm <> 'Een gepubliceerd examen heeft minimaal één vraag nodig' then raise; end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Trigger stond een gepubliceerd examen zonder vragen toe'; end if;

  v_rejected := false;
  begin
    insert into public.questions (id, exam_id, question_text, question_type, correct_number, sort_order)
    select gen_random_uuid(), v_exam_id, 'Extra vraag', 'number', 1, n
    from generate_series(1, 7) n;
    set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  exception when raise_exception then
    if sqlerrm <> 'Een examen kan maximaal 50 vragen bevatten' then raise; end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Trigger stond een examen met meer dan 50 vragen toe'; end if;
end;
$$;
set local role authenticated;
do $$
declare
  t record; d jsonb; qs jsonb := '[]'::jsonb; q jsonb; opts jsonb;
  answers jsonb := '{}'::jsonb; a jsonb; b jsonb; review jsonb;
  kind text; qid uuid; first_id uuid; second_id uuid; third_id uuid;
  multiple_id uuid; multiple_first uuid; multiple_second uuid; failed boolean;
begin
  select * into t from exam_test_ids;
  foreach kind in array array['yes_no', 'multiple_response', 'single_drag', 'hotspot'] loop
    qid := gen_random_uuid(); first_id := gen_random_uuid(); second_id := gen_random_uuid(); third_id := gen_random_uuid();
    opts := jsonb_build_array(
      jsonb_build_object('id', first_id, 'option_text', 'A', 'image_url', null, 'is_correct', true,
        'coordinates_x', case when kind in ('single_drag', 'hotspot') then 25 else null end,
        'coordinates_y', case when kind in ('single_drag', 'hotspot') then 50 else null end, 'correct_order', null),
      jsonb_build_object('id', second_id, 'option_text', 'B', 'image_url', null, 'is_correct', kind = 'multiple_response',
        'coordinates_x', case when kind in ('single_drag', 'hotspot') then 75 else null end,
        'coordinates_y', case when kind in ('single_drag', 'hotspot') then 50 else null end, 'correct_order', null));
    if kind = 'multiple_response' then
      opts := opts || jsonb_build_array(jsonb_build_object('id', third_id, 'option_text', 'C', 'image_url', null,
        'is_correct', false, 'coordinates_x', null, 'coordinates_y', null, 'correct_order', null));
      multiple_id := qid; multiple_first := first_id; multiple_second := second_id;
      answers := answers || jsonb_build_object(qid::text, jsonb_build_array(second_id, first_id));
    else
      answers := answers || jsonb_build_object(qid::text, first_id::text);
    end if;
    q := jsonb_build_object('id', qid, 'question_text', kind, 'question_type', kind,
      'image_url', case when kind in ('single_drag', 'hotspot') then t.exam_id::text || '/test.png' else null end,
      'correct_number', null, 'explanation', 'Uitleg', 'options', opts);
    qs := qs || jsonb_build_array(q);
  end loop;
  d := jsonb_build_object('id', t.exam_id, 'title', 'Vraagtypen', 'description', '', 'time_limit_minutes', 30,
    'passing_score', 44, 'allowed_packages', jsonb_build_array('start'), 'is_published', true, 'questions', qs);
  perform set_config('request.jwt.claim.sub', t.admin_id::text, true);
  perform public.exam_save_definition(d);
  set constraints exams_integrated_question_limits, questions_integrated_question_limits immediate;
  set constraints exams_integrated_question_limits, questions_integrated_question_limits deferred;
  perform set_config('request.jwt.claim.sub', t.student_id::text, true);
  a := public.exam_attempt_action(t.exam_id, 'start');
  if (a->'questions')::text like '%is_correct%' or (a->'questions')::text like '%correct_order%' then
    raise exception 'Actieve poging lekt antwoorden';
  end if;
  failed := false;
  begin perform public.exam_attempt_action(t.exam_id, 'save', (a->>'id')::uuid,
    answers || jsonb_build_object(multiple_id::text, jsonb_build_array(multiple_first, multiple_first)), '[]', 0);
  exception when others then failed := true; end;
  if not failed then raise exception 'Dubbele multiple-responseoptie geaccepteerd'; end if;
  failed := false;
  begin perform public.exam_attempt_action(t.exam_id, 'save', (a->>'id')::uuid,
    answers || jsonb_build_object(multiple_id::text, jsonb_build_array(gen_random_uuid())), '[]', 0);
  exception when others then failed := true; end;
  if not failed then raise exception 'Onbekende multiple-responseoptie geaccepteerd'; end if;
  b := public.exam_attempt_action(t.exam_id, 'submit', (a->>'id')::uuid, answers, '[]', 0);
  if (b->>'score')::int <> 4 then raise exception 'Nieuwe vraagtypen verkeerd beoordeeld: %', b; end if;
  review := public.exam_attempt_review((a->>'id')::uuid);
  if jsonb_array_length(review) <> 4 or review->1->'options'->1->>'is_correct' <> 'true' then
    raise exception 'Nakijken nieuwe vraagtypen mislukt';
  end if;
  a := public.exam_attempt_action(t.exam_id, 'start');
  b := public.exam_attempt_action(t.exam_id, 'submit', (a->>'id')::uuid,
    answers || jsonb_build_object(multiple_id::text, jsonb_build_array(multiple_first)), '[]', 0);
  if (b->>'score')::int <> 3 then raise exception 'Gedeeltelijk multiple-responseantwoord is onterecht goed'; end if;
end;
$$;
reset role;
rollback;
