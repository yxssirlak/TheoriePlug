-- Draai op een testdatabase na de migratie binnen een teruggedraaide transactie.
-- De aanroeper moet de transactie altijd terugdraaien.
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
  t record; d jsonb; a jsonb; b jsonb; answer jsonb; failed boolean;
begin
  select * into t from exam_test_ids;
  perform set_config('request.jwt.claim.sub', t.admin_id::text, true);
  d := jsonb_build_object('id', t.exam_id, 'title', 'Test', 'description', '', 'time_limit_minutes', 30,
    'passing_score', 2, 'allowed_packages', jsonb_build_array('start'), 'is_published', true, 'questions',
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
          jsonb_build_object('id', t.o5, 'option_text', '', 'image_url', null, 'is_correct', false, 'coordinates_x', 30, 'coordinates_y', 30, 'correct_order', 3)))));
  perform public.exam_save_definition(d);
  if jsonb_array_length(public.exam_admin_definition(t.exam_id)->'questions') <> 3 then raise exception 'Admin laden mislukt'; end if;
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
  if b->>'status' <> 'completed' or (b->>'score')::int <> 3 then raise exception 'Beoordeling of momentopname mislukt: %', b; end if;
  if jsonb_array_length(b->'result') <> 3 then raise exception 'Resultaat ontbreekt'; end if;
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
