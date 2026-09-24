create table public.listening_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  track_id text,
  track_title text,
  artist_name text,
  artwork_url text,
  is_playing boolean not null default false,
  position_seconds numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index listening_presence_updated_at_idx on public.listening_presence (updated_at);

alter table public.listening_presence enable row level security;

create policy "Users can create their own listening presence"
  on public.listening_presence for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own listening presence"
  on public.listening_presence for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read accepted friends presence"
  on public.listening_presence for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.friendships
      where status = 'accepted'
        and ((requester_id = (select auth.uid()) and addressee_id = user_id)
          or (addressee_id = (select auth.uid()) and requester_id = user_id))
    )
  );

create trigger listening_presence_updated_at
  before update on public.listening_presence
  for each row execute procedure public.set_updated_at();

alter publication supabase_realtime add table public.listening_presence;