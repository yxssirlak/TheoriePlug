insert into public.packages (name, duration_days, price_cents, is_active)
select seed.name, seed.duration_days, seed.price_cents, true
from (values ('Start', 7, 2999), ('Boost', 14, 3999), ('Max', 31, 4499)) as seed(name, duration_days, price_cents)
where not exists (select 1 from public.packages p where lower(p.name) = lower(seed.name));

update public.packages
set duration_days = case lower(name) when 'start' then 7 when 'boost' then 14 when 'max' then 31 end
where lower(name) in ('start', 'boost', 'max');
