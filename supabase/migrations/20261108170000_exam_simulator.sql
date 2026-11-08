-- Examenmodule. De bestaande exam_questions blijven onaangeroerd.
-- Correcte antwoorden en momentopnamen zijn alleen voor beheerders zichtbaar.

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  time_limit_minutes integer not null check (time_limit_minutes between 1 and 240),
  passing_score integer not null check (passing_score >= 1),
  allowed_packages text[] not null default array['start', 'boost', 'max']::text[]
    check (cardinality(allowed_packages) > 0 and allowed_packages <@ array['start', 'boost', 'max']::text[]),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null check (length(trim(question_text)) between 1 and 5000),
  image_url text,
  question_type text not null check (question_type in ('multiple_choice', 'number', 'ordering')),
  correct_number numeric,
  sort_order integer not null default 0,
  explanation text not null default '',
  created_at timestamptz not null default now(),
  check ((question_type = 'number') = (correct_number is not null))
);
create index questions_exam_order_idx on public.questions(exam_id, sort_order, id);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null default '',
  image_url text,
  is_correct boolean not null default false,
  coordinates_x numeric check (coordinates_x between 0 and 100),
  coordinates_y numeric check (coordinates_y between 0 and 100),
  correct_order integer check (correct_order between 1 and 4),
  sort_order integer not null default 0,
  check ((coordinates_x is null) = (coordinates_y is null))
);
create index question_options_question_order_idx on public.question_options(question_id, sort_order, id);

-- De momentopname bevat ook correcte antwoorden en is nooit leesbaar door
-- leerlingen. De server toont tijdens een poging alleen de veilige velden.
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  marked_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(marked_questions) = 'array'),
  revision integer not null default 0 check (revision >= 0),
  score integer,
  question_count integer not null check (question_count > 0),
  passing_score integer not null check (passing_score between 1 and question_count),
  result jsonb,
  check (deadline_at > started_at),
  check (
    (status = 'in_progress' and submitted_at is null and score is null and result is null)
    or
    (status = 'completed' and submitted_at is not null and score is not null and score between 0 and question_count
      and result is not null and jsonb_typeof(result) = 'array')
  )
);
create index exam_attempts_user_exam_idx on public.exam_attempts(user_id, exam_id, started_at desc);
create unique index exam_attempts_one_active_idx on public.exam_attempts(user_id, exam_id)
  where status = 'in_progress';

create table public.exam_attempt_snapshots (
  attempt_id uuid primary key references public.exam_attempts(id) on delete cascade,
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  exam_title text not null,
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_snapshots enable row level security;

create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    join public.user_access ua on ua.user_id = auth.uid()
    join public.packages p on p.id = ua.package_id
    where e.id = p_exam_id
      and e.is_published
      and ua.payment_status = 'paid'
      and ua.expires_at > now()
      and lower(p.name) = any(e.allowed_packages)
  );
$$;
revoke all on function public.can_access_exam(uuid) from public;
grant execute on function public.can_access_exam(uuid) to authenticated;

create policy "exams_read" on public.exams for select to authenticated
  using (public.is_admin() or public.can_access_exam(id));
create policy "exams_admin_write" on public.exams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "questions_admin" on public.questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "question_options_admin" on public.question_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "exam_attempts_read_own" on public.exam_attempts for select to authenticated
  using ((user_id = auth.uid() and public.can_access_exam(exam_id)) or public.is_admin());
create policy "exam_attempt_snapshots_admin_read" on public.exam_attempt_snapshots for select to authenticated
  using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-images', 'exam-images', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

create policy "exam_images_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'exam-images' and public.is_admin());
create policy "exam_images_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'exam-images' and public.is_admin())
  with check (bucket_id = 'exam-images' and public.is_admin());
create policy "exam_images_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'exam-images' and public.is_admin());
create policy "exam_images_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'exam-images' and (
      public.is_admin() or exists (
        select 1 from public.exams e
        where e.id::text = (storage.foldername(name))[1]
          and public.can_access_exam(e.id)
      )
    )
  );

create or replace function public.exam_save_definition(p_definition jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_question jsonb;
  v_option jsonb;
  v_q_order integer := 0;
  v_o_order integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Geen beheerderstoegang';
  end if;
  if jsonb_typeof(p_definition) <> 'object' or jsonb_typeof(p_definition->'questions') <> 'array'
     or jsonb_typeof(p_definition->'allowed_packages') <> 'array'
     or jsonb_array_length(p_definition->'questions') > 200 then
    raise exception 'Ongeldige examendefinitie';
  end if;
  v_id := (p_definition->>'id')::uuid;
  if coalesce((p_definition->>'is_published')::boolean, false)
     and (jsonb_array_length(p_definition->'questions') = 0
       or (p_definition->>'passing_score')::integer > jsonb_array_length(p_definition->'questions')) then
    raise exception 'Een gepubliceerd examen heeft voldoende vragen nodig';
  end if;
  insert into public.exams (id, title, description, time_limit_minutes, passing_score, allowed_packages, is_published)
  values (v_id, p_definition->>'title', p_definition->>'description',
    (p_definition->>'time_limit_minutes')::integer, (p_definition->>'passing_score')::integer,
    array(select jsonb_array_elements_text(p_definition->'allowed_packages')),
    (p_definition->>'is_published')::boolean)
  on conflict (id) do update set title = excluded.title, description = excluded.description,
    time_limit_minutes = excluded.time_limit_minutes, passing_score = excluded.passing_score,
    allowed_packages = excluded.allowed_packages, is_published = excluded.is_published;

  delete from public.questions where exam_id = v_id;
  for v_question in select value from jsonb_array_elements(p_definition->'questions') loop
    insert into public.questions (id, exam_id, question_text, image_url, question_type, correct_number, explanation, sort_order)
    values ((v_question->>'id')::uuid, v_id, v_question->>'question_text', v_question->>'image_url',
      v_question->>'question_type', (v_question->>'correct_number')::numeric, v_question->>'explanation', v_q_order);
    v_q_order := v_q_order + 1;
    v_o_order := 0;
    for v_option in select value from jsonb_array_elements(v_question->'options') loop
      insert into public.question_options (id, question_id, option_text, image_url, is_correct, coordinates_x, coordinates_y, correct_order, sort_order)
      values ((v_option->>'id')::uuid, (v_question->>'id')::uuid, v_option->>'option_text', v_option->>'image_url',
        (v_option->>'is_correct')::boolean, (v_option->>'coordinates_x')::numeric,
        (v_option->>'coordinates_y')::numeric, (v_option->>'correct_order')::integer, v_o_order);
      v_o_order := v_o_order + 1;
    end loop;
  end loop;
  return v_id;
end;
$$;
revoke all on function public.exam_save_definition(jsonb) from public, anon;
grant execute on function public.exam_save_definition(jsonb) to authenticated;

create or replace function public.exam_admin_definition(p_exam_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Geen beheerderstoegang'; end if;
  select to_jsonb(e) - 'created_at' || jsonb_build_object('questions', coalesce((
    select jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
      'image_url', q.image_url, 'question_type', q.question_type, 'correct_number', q.correct_number,
      'explanation', q.explanation, 'options', coalesce((
        select jsonb_agg(to_jsonb(o) - 'question_id' - 'sort_order' order by o.sort_order, o.id)
        from public.question_options o where o.question_id = q.id
      ), '[]'::jsonb)) order by q.sort_order, q.id)
    from public.questions q where q.exam_id = e.id
  ), '[]'::jsonb)) into v_result from public.exams e where e.id = p_exam_id;
  if v_result is null then raise exception 'Examen niet gevonden'; end if;
  return v_result;
end;
$$;
revoke all on function public.exam_admin_definition(uuid) from public, anon;
grant execute on function public.exam_admin_definition(uuid) to authenticated;

create or replace function public.exam_student_list()
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Log eerst in'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'time_limit_minutes', e.time_limit_minutes, 'passing_score', e.passing_score,
    'question_count', (select count(*) from public.questions q where q.exam_id = e.id),
    'best_score', (select max(a.score) from public.exam_attempts a where a.exam_id = e.id and a.user_id = auth.uid() and a.status = 'completed'),
    'active_attempt', (select a.id from public.exam_attempts a where a.exam_id = e.id and a.user_id = auth.uid() and a.status = 'in_progress')
  ) order by e.created_at desc) from public.exams e where public.can_access_exam(e.id)), '[]'::jsonb);
end;
$$;
revoke all on function public.exam_student_list() from public, anon;
grant execute on function public.exam_student_list() to authenticated;

create or replace function public.exam_finalize_attempt(p_attempt_id uuid)
returns public.exam_attempts language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_questions jsonb;
  v_question jsonb;
  v_answer jsonb;
  v_results jsonb := '[]'::jsonb;
  v_result boolean;
  v_score integer := 0;
  v_time timestamptz := clock_timestamp();
begin
  select * into strict v_attempt from public.exam_attempts where id = p_attempt_id for update;
  if v_attempt.status = 'completed' then return v_attempt; end if;
  select questions into strict v_questions from public.exam_attempt_snapshots where attempt_id = p_attempt_id;
  for v_question in select value from jsonb_array_elements(v_questions) loop
    v_answer := v_attempt.answers->(v_question->>'id');
    v_result := false;
    if v_question->>'question_type' = 'multiple_choice' then
      select exists (select 1 from jsonb_array_elements(v_question->'options') o
        where (o->>'is_correct')::boolean and o->>'id' = v_answer#>>'{}') into v_result;
    elsif v_question->>'question_type' = 'number' then
      if jsonb_typeof(v_answer) = 'string' and (v_answer#>>'{}') ~ '^-?[0-9]+([.,][0-9]+)?$' then
        v_result := replace(v_answer#>>'{}', ',', '.')::numeric = (v_question->>'correct_number')::numeric;
      end if;
    elsif jsonb_typeof(v_answer) = 'object' then
      v_result := (select count(*) from jsonb_each(v_answer)) = jsonb_array_length(v_question->'options')
        and not exists (select 1 from jsonb_array_elements(v_question->'options') o
          where v_answer->(o->>'id') is distinct from o->'correct_order');
    end if;
    if v_result then v_score := v_score + 1; end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'question_id', v_question->>'id', 'question_text', v_question->>'question_text',
      'correct', v_result, 'explanation', v_question->>'explanation'));
  end loop;
  update public.exam_attempts set status = 'completed', submitted_at = v_time, score = v_score,
    result = v_results, updated_at = v_time where id = v_attempt.id returning * into v_attempt;
  return v_attempt;
end;
$$;
revoke all on function public.exam_finalize_attempt(uuid) from public, anon, authenticated;

create or replace function public.exam_finalize_expired()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_count integer := 0;
begin
  for v_id in select id from public.exam_attempts
    where status = 'in_progress' and deadline_at <= clock_timestamp()
    order by deadline_at limit 100 for update skip locked loop
    perform public.exam_finalize_attempt(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.exam_finalize_expired() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('theorieplug-exam-expiry', '* * * * *', 'select public.exam_finalize_expired()');

-- Een leerling kan nooit rechtstreeks de momentopname of correcte antwoorden lezen.
create or replace function public.exam_attempt_action(
  p_exam_id uuid, p_action text, p_attempt_id uuid default null,
  p_answers jsonb default null, p_marks jsonb default null, p_revision integer default null
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_exam public.exams%rowtype;
  v_attempt public.exam_attempts%rowtype;
  v_questions jsonb;
  v_question jsonb;
  v_option jsonb;
  v_answer jsonb;
  v_safe jsonb := '[]'::jsonb;
  v_time timestamptz;
  v_key text;
  v_value jsonb;
  v_option_count integer;
  v_values integer[];
begin
  if auth.uid() is null or not public.can_access_exam(p_exam_id) then
    raise exception 'Geen toegang tot dit examen';
  end if;
  if p_action not in ('start', 'get', 'save', 'submit') then
    raise exception 'Ongeldige actie';
  end if;
  select * into v_exam from public.exams where id = p_exam_id for update;
  if p_action = 'start' then
    select * into v_attempt from public.exam_attempts
      where exam_id = p_exam_id and user_id = auth.uid() and status = 'in_progress' for update;
    if not found then
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'image_url', q.image_url,
        'question_type', q.question_type, 'correct_number', q.correct_number,
        'explanation', q.explanation, 'options', coalesce((
          select jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text,
            'image_url', o.image_url, 'is_correct', o.is_correct, 'coordinates_x', o.coordinates_x,
            'coordinates_y', o.coordinates_y, 'correct_order', o.correct_order) order by o.sort_order, o.id)
          from public.question_options o where o.question_id = q.id
        ), '[]'::jsonb)
      ) order by q.sort_order, q.id), '[]'::jsonb)
      into v_questions from public.questions q where q.exam_id = p_exam_id;
      if jsonb_array_length(v_questions) = 0 or v_exam.passing_score > jsonb_array_length(v_questions) then
        raise exception 'Examen is nog niet klaar';
      end if;
      v_time := clock_timestamp();
      insert into public.exam_attempts (exam_id, user_id, started_at, deadline_at, question_count, passing_score)
      values (p_exam_id, auth.uid(), v_time, v_time + make_interval(mins => v_exam.time_limit_minutes),
        jsonb_array_length(v_questions), v_exam.passing_score)
      returning * into v_attempt;
      insert into public.exam_attempt_snapshots (attempt_id, questions, exam_title)
      values (v_attempt.id, v_questions, v_exam.title);
    end if;
  else
    select * into v_attempt from public.exam_attempts
      where id = p_attempt_id and exam_id = p_exam_id and user_id = auth.uid() for update;
    if not found then raise exception 'Poging niet gevonden'; end if;
  end if;
  select questions into strict v_questions from public.exam_attempt_snapshots where attempt_id = v_attempt.id;
  v_time := clock_timestamp();
  if v_attempt.status = 'in_progress' and p_action in ('save', 'submit') and v_time < v_attempt.deadline_at then
    if p_revision is null or p_revision <> v_attempt.revision then
      raise exception 'Deze poging is elders gewijzigd. Herlaad de pagina.';
    end if;
    if jsonb_typeof(p_answers) is distinct from 'object' or jsonb_typeof(p_marks) is distinct from 'array'
       or length(p_answers::text) > 100000 or jsonb_array_length(p_marks) > v_attempt.question_count then
      raise exception 'Ongeldige antwoorden of markeringen';
    end if;
    if exists (select 1 from jsonb_array_elements(p_marks) m where jsonb_typeof(m) <> 'string'
      or not exists (select 1 from jsonb_array_elements(v_questions) q where q->>'id' = m#>>'{}'))
      or (select count(distinct value) from jsonb_array_elements(p_marks)) <> jsonb_array_length(p_marks) then
      raise exception 'Ongeldige markeringen';
    end if;
    for v_key, v_value in select * from jsonb_each(p_answers) loop
      select value into v_question from jsonb_array_elements(v_questions) where value->>'id' = v_key;
      if not found then raise exception 'Onbekende vraag'; end if;
      if v_question->>'question_type' = 'multiple_choice' then
        if jsonb_typeof(v_value) <> 'string' or not exists (
          select 1 from jsonb_array_elements(v_question->'options') o where o->>'id' = v_value#>>'{}'
        ) then raise exception 'Ongeldig antwoord'; end if;
      elsif v_question->>'question_type' = 'number' then
        if jsonb_typeof(v_value) <> 'string' or length(v_value#>>'{}') > 64
          or (v_value#>>'{}') !~ '^-?[0-9]*([.,][0-9]*)?$' then raise exception 'Ongeldig getal'; end if;
      else
        if jsonb_typeof(v_value) <> 'object' then raise exception 'Ongeldige volgorde'; end if;
        v_values := array[]::integer[];
        v_option_count := jsonb_array_length(v_question->'options');
        for v_key, v_answer in select * from jsonb_each(v_value) loop
          if not exists (select 1 from jsonb_array_elements(v_question->'options') o where o->>'id' = v_key)
            or jsonb_typeof(v_answer) <> 'number' or v_answer::text !~ '^[1-4]$'
            or (v_answer::text)::integer > v_option_count
            or (v_answer::text)::integer = any(v_values) then raise exception 'Ongeldige volgorde'; end if;
          v_values := array_append(v_values, (v_answer::text)::integer);
        end loop;
      end if;
    end loop;
    v_time := clock_timestamp();
    if v_time < v_attempt.deadline_at then
      update public.exam_attempts set answers = p_answers, marked_questions = p_marks,
        revision = revision + 1, updated_at = v_time where id = v_attempt.id returning * into v_attempt;
    end if;
  end if;
  if v_attempt.status = 'in_progress' and (p_action = 'submit' or v_time >= v_attempt.deadline_at) then
    v_attempt := public.exam_finalize_attempt(v_attempt.id);
  end if;
  if v_attempt.status = 'in_progress' then
    for v_question in select value from jsonb_array_elements(v_questions) loop
      select coalesce(jsonb_agg(o - 'is_correct' - 'correct_order'
        order by case when v_question->>'question_type' = 'ordering' then o->>'id' else lpad(n::text, 10, '0') end), '[]'::jsonb)
        into v_option from jsonb_array_elements(v_question->'options') with ordinality as options(o,n);
      v_safe := v_safe || jsonb_build_array((v_question - 'correct_number' - 'explanation' - 'options') || jsonb_build_object('options', v_option));
    end loop;
  end if;
  return jsonb_build_object('id', v_attempt.id, 'exam_id', v_attempt.exam_id, 'status', v_attempt.status,
    'started_at', v_attempt.started_at, 'deadline_at', v_attempt.deadline_at, 'server_time', v_time,
    'answers', v_attempt.answers, 'marked_questions', v_attempt.marked_questions, 'revision', v_attempt.revision,
    'score', v_attempt.score, 'question_count', v_attempt.question_count, 'passing_score', v_attempt.passing_score,
    'result', v_attempt.result, 'questions', v_safe);
end;
$$;
revoke all on function public.exam_attempt_action(uuid, text, uuid, jsonb, jsonb, integer) from public, anon;
grant execute on function public.exam_attempt_action(uuid, text, uuid, jsonb, jsonb, integer) to authenticated;
