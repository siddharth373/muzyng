create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create unique index profiles_username_unique on public.profiles (username);
create index profiles_created_at_idx on public.profiles (created_at);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(new.raw_user_meta_data ->> 'username'));

  if requested_username is null or requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3-24 lowercase letters, numbers, or underscores.';
  end if;

  if exists (select 1 from public.profiles where username = requested_username) then
    raise exception 'Username already taken.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_username);
  return new;
exception
  when unique_violation then
    raise exception 'Username already taken.';
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();