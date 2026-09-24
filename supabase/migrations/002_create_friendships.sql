create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint friendships_different_users check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create unique index friendships_participants_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_idx on public.friendships (requester_id, status);
create index friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

create policy "Authenticated users can search public profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = requester_id);

create policy "Users can view their friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Addressees can respond to friend requests"
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) = addressee_id)
  with check (
    (select auth.uid()) = addressee_id
    and status in ('accepted', 'rejected')
  );

create or replace function public.prevent_friendship_participant_change()
returns trigger
language plpgsql
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Friendship participants cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger friendships_participants_immutable
  before update on public.friendships
  for each row execute procedure public.prevent_friendship_participant_change();

create policy "Participants can remove friendships"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create trigger friendships_updated_at
  before update on public.friendships
  for each row execute procedure public.set_updated_at();