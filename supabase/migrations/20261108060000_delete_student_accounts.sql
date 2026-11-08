alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

alter table public.user_access drop constraint user_access_user_id_fkey;
alter table public.user_access add constraint user_access_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.orders drop constraint orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.admin_user_mutations drop constraint admin_user_mutations_target_id_fkey;
alter table public.admin_user_mutations add constraint admin_user_mutations_target_id_fkey
  foreign key (target_id) references auth.users (id) on delete cascade;
