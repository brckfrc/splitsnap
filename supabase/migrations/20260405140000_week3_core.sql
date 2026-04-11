-- SplitSnap Week 3 — profiles, friends, groups, activity_log (+ archive shell)
-- Spec: docs/DATABASE.md (Hafta 3). Expenses / settlements deferred to later migrations.

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 2. Tables (FK order)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text,
  user_invite_code text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint profiles_user_invite_code_key unique (user_invite_code)
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  constraint friend_requests_distinct_users check (from_user_id <> to_user_id),
  constraint friend_requests_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles (id),
  invite_code text not null,
  currency text not null default 'TRY',
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint groups_invite_code_key unique (invite_code)
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (group_id, user_id),
  constraint group_members_role_check check (role in ('admin', 'member'))
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Mirror for archival (no FKs — rows survive group lifecycle for ops)
create table public.activity_log_archive (
  id uuid primary key,
  group_id uuid not null,
  actor_id uuid not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null
);

-- -----------------------------------------------------------------------------
-- 3. Indexes (partial + list)
-- -----------------------------------------------------------------------------
create unique index friend_requests_one_pending_per_pair
  on public.friend_requests (
    least(from_user_id, to_user_id),
    greatest(from_user_id, to_user_id)
  )
  where status = 'pending';

create index idx_friend_requests_to_pending
  on public.friend_requests (to_user_id)
  where status = 'pending';

create index idx_friend_requests_from
  on public.friend_requests (from_user_id);

create index idx_group_members_user_active
  on public.group_members (user_id)
  where left_at is null;

create index idx_group_members_group
  on public.group_members (group_id);

create index idx_activity_log_group_created
  on public.activity_log (group_id, created_at desc);

create index idx_activity_log_entity
  on public.activity_log (entity_type, entity_id);

create index idx_activity_log_archive_group_created
  on public.activity_log_archive (group_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER, stable where noted)
-- -----------------------------------------------------------------------------
create or replace function public.generate_global_unique_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  _code text;
  _taken boolean;
begin
  loop
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(
      select 1 from public.groups g where g.invite_code = _code
      union all
      select 1 from public.profiles p where p.user_invite_code = _code
    )
    into _taken;
    exit when not _taken;
  end loop;
  return _code;
end;
$$;

create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = _group_id
      and m.user_id = (select auth.uid())
      and m.left_at is null
  );
$$;

create or replace function public.is_group_participant(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = _group_id
      and m.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. Triggers: updated_at, group invite_code, owner membership
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.trg_generate_group_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is not null and trim(new.invite_code) <> '' then
    new.invite_code := upper(trim(new.invite_code));
    return new;
  end if;
  new.invite_code := public.generate_global_unique_code();
  return new;
end;
$$;

create trigger trg_groups_generate_invite_code
  before insert on public.groups
  for each row
  execute function public.trg_generate_group_invite_code();

create or replace function public.trg_add_owner_as_group_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'admin');
  return new;
end;
$$;

create trigger trg_groups_add_owner_member
  after insert on public.groups
  for each row
  execute function public.trg_add_owner_as_group_member();

-- -----------------------------------------------------------------------------
-- 6. Auth: new user -> profile + user_invite_code
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, user_invite_code)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Kullanıcı'
    ),
    new.email,
    public.generate_global_unique_code()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. RPCs (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
create or replace function public.join_group_by_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _group_id uuid;
  _norm text;
begin
  _norm := upper(trim(code));
  if _norm = '' then
    raise exception 'invalid_invite_code';
  end if;

  select g.id
  into _group_id
  from public.groups g
  where g.invite_code = _norm
    and g.deleted_at is null;

  if _group_id is null then
    raise exception 'invalid_invite_code';
  end if;

  if exists (
    select 1
    from public.group_members m
    where m.group_id = _group_id
      and m.user_id = auth.uid()
  ) then
    update public.group_members m
    set
      left_at = null,
      joined_at = now()
    where m.group_id = _group_id
      and m.user_id = auth.uid()
      and m.left_at is not null;
    return _group_id;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (_group_id, auth.uid(), 'member');

  return _group_id;
end;
$$;

create or replace function public.lookup_user_by_friend_code(p_code text)
returns table (
  id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _norm text;
begin
  _norm := upper(trim(p_code));
  return query
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where p.user_invite_code = _norm
  limit 1;
end;
$$;

create or replace function public.send_friend_request_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _to_id uuid;
  _norm text;
  _fr_id uuid;
begin
  _norm := upper(trim(p_code));
  if _norm = '' then
    raise exception 'user_not_found';
  end if;

  select p.id
  into _to_id
  from public.profiles p
  where p.user_invite_code = _norm
  limit 1;

  if _to_id is null then
    raise exception 'user_not_found';
  end if;

  if _to_id = auth.uid() then
    raise exception 'cannot_friend_self';
  end if;

  if exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.from_user_id = auth.uid() and fr.to_user_id = _to_id)
        or (fr.from_user_id = _to_id and fr.to_user_id = auth.uid())
      )
  ) then
    raise exception 'already_friends';
  end if;

  if exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'pending'
      and (
        (fr.from_user_id = auth.uid() and fr.to_user_id = _to_id)
        or (fr.from_user_id = _to_id and fr.to_user_id = auth.uid())
      )
  ) then
    raise exception 'pending_request_exists';
  end if;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (auth.uid(), _to_id, 'pending')
  returning friend_requests.id into _fr_id;

  return _fr_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Row Level Security + policies
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.activity_log enable row level security;
alter table public.activity_log_archive enable row level security;

-- profiles
create policy profiles_select_own_or_related
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.group_members m1
      join public.group_members m2 on m1.group_id = m2.group_id
      where m1.user_id = (select auth.uid())
        and m2.user_id = profiles.id
    )
    or exists (
      select 1
      from public.friend_requests fr
      where fr.status in ('pending', 'accepted')
        and (
          (fr.from_user_id = (select auth.uid()) and fr.to_user_id = profiles.id)
          or (fr.to_user_id = (select auth.uid()) and fr.from_user_id = profiles.id)
        )
    )
  );

create policy profiles_insert_self
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- friend_requests
create policy friend_requests_select_involved
  on public.friend_requests
  for select
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  );

create policy friend_requests_update_recipient
  on public.friend_requests
  for update
  to authenticated
  using (
    to_user_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    to_user_id = (select auth.uid())
    and status in ('accepted', 'rejected')
  );

create policy friend_requests_delete_sender_pending
  on public.friend_requests
  for delete
  to authenticated
  using (
    from_user_id = (select auth.uid())
    and status = 'pending'
  );

-- groups
create policy groups_select_participant
  on public.groups
  for select
  to authenticated
  using (public.is_group_participant(id));

create policy groups_insert_owner_self
  on public.groups
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy groups_update_owner
  on public.groups
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- group_members
create policy group_members_select_same_group
  on public.group_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_members m
      where m.group_id = group_members.group_id
        and m.user_id = (select auth.uid())
    )
  );

create policy group_members_update_leave_or_owner
  on public.group_members
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = (select auth.uid())
    )
  );

-- activity_log
create policy activity_log_select_participant
  on public.activity_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_members m
      where m.group_id = activity_log.group_id
        and m.user_id = (select auth.uid())
    )
  );

create policy activity_log_insert_active_member
  on public.activity_log
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and public.is_group_member(group_id)
  );

-- activity_log_archive (read same as live; writes via service role / cron)
create policy activity_log_archive_select_participant
  on public.activity_log_archive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_members m
      where m.group_id = activity_log_archive.group_id
        and m.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 9. Grants: RPCs to authenticated; lock down function public access
-- -----------------------------------------------------------------------------
revoke all on function public.generate_global_unique_code() from public;
revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_participant(uuid) from public;
revoke all on function public.join_group_by_invite(text) from public;
revoke all on function public.lookup_user_by_friend_code(text) from public;
revoke all on function public.send_friend_request_by_code(text) from public;

grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.lookup_user_by_friend_code(text) to authenticated;
grant execute on function public.send_friend_request_by_code(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. Realtime (groups, members, friend_requests)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.friend_requests;
