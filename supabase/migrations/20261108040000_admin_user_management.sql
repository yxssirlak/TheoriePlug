create table public.admin_user_mutations (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  actor_email text not null,
  target_id uuid not null references auth.users(id),
  action text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.admin_user_mutations enable row level security;
create policy "admin_user_mutations_read" on public.admin_user_mutations
  for select to authenticated using (public.is_admin());

insert into public.packages (name, duration_days, price_cents, is_active)
select seed.name, seed.duration_days, seed.price_cents, true
from (values ('Start', 7, 2999), ('Boost', 14, 3999), ('Max', 30, 4499)) as seed(name, duration_days, price_cents)
where not exists (select 1 from public.packages p where lower(p.name) = lower(seed.name));

create function public.admin_user_directory()
returns table (id uuid, email text, first_name text, last_name text, created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Geen toegang.' using errcode = '42501';
  end if;
  return query select p.id, u.email::text, p.first_name, p.last_name, p.created_at
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end;
$$;
revoke all on function public.admin_user_directory() from public;
grant execute on function public.admin_user_directory() to authenticated;

create function public.admin_save_user(
  p_user_id uuid, p_first_name text, p_last_name text,
  p_access_id uuid default null, p_package_id uuid default null,
  p_payment_status text default null, p_expires_at timestamptz default null,
  p_invited boolean default false
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  old_profile jsonb;
  old_access jsonb;
  new_access jsonb;
  changed boolean := false;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Geen toegang.' using errcode = '42501';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Gebruiker bestaat niet.';
  end if;
  if length(coalesce(p_first_name, '')) > 100 or length(coalesce(p_last_name, '')) > 100 then
    raise exception 'Naam is te lang.';
  end if;
  select to_jsonb(p) into old_profile from public.profiles p where p.id = p_user_id for update;
  if old_profile is null and not p_invited then
    raise exception 'Profiel bestaat niet.';
  end if;
  if p_invited and old_profile is not null then
    raise exception 'Profiel bestaat al.';
  end if;
  if p_package_id is not null then
    if not exists (select 1 from public.packages where id = p_package_id) or p_expires_at is null
      or p_payment_status not in ('paid', 'pending', 'failed', 'canceled', 'expired') or p_payment_status is null then
      raise exception 'Ongeldige pakketgegevens.';
    end if;
  elsif p_access_id is not null or p_payment_status is not null or p_expires_at is not null then
    raise exception 'Kies een pakket voor de toegang.';
  end if;
  insert into public.profiles (id, first_name, last_name)
    values (p_user_id, nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''))
    on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name;
  if p_invited or old_profile->>'first_name' is distinct from nullif(trim(p_first_name), '')
    or old_profile->>'last_name' is distinct from nullif(trim(p_last_name), '') then
    changed := true;
  end if;
  if p_package_id is not null then
    if p_access_id is null then
      insert into public.user_access (user_id, package_id, payment_status, expires_at)
        values (p_user_id, p_package_id, p_payment_status, p_expires_at) returning to_jsonb(user_access) into new_access;
      changed := true;
    else
      select to_jsonb(a) into old_access from public.user_access a where a.id = p_access_id and a.user_id = p_user_id for update;
      if old_access is null then raise exception 'Pakkettoegang bestaat niet voor deze gebruiker.'; end if;
      update public.user_access set package_id = p_package_id, payment_status = p_payment_status, expires_at = p_expires_at
        where id = p_access_id returning to_jsonb(user_access) into new_access;
      if old_access is distinct from new_access then changed := true; end if;
    end if;
  end if;
  if changed then
    insert into public.admin_user_mutations (actor_id, actor_email, target_id, action, details)
    values (auth.uid(), (select email from public.admins where user_id = auth.uid()), p_user_id, case when p_invited then 'uitgenodigd' else 'gewijzigd' end,
      jsonb_build_object('profiel_vorige', case when old_profile is null then null else jsonb_build_object('voornaam', old_profile->>'first_name', 'achternaam', old_profile->>'last_name') end,
        'profiel_nieuw', jsonb_build_object('voornaam', nullif(trim(p_first_name), ''), 'achternaam', nullif(trim(p_last_name), '')),
        'toegang_vorige', old_access, 'toegang_nieuw', new_access));
  end if;
end;
$$;
revoke all on function public.admin_save_user(uuid, text, text, uuid, uuid, text, timestamptz, boolean) from public;
grant execute on function public.admin_save_user(uuid, text, text, uuid, uuid, text, timestamptz, boolean) to authenticated;
