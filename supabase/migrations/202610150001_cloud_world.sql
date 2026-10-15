-- Only the Edge Function (service_role) may initialize or mutate the shared world.
create table public.game_worlds (
  id text primary key check (id = 'home'), revision bigint not null default 0,
  data jsonb, holds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), imported_by uuid
);
insert into public.game_worlds(id) values ('home');
create table public.game_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.game_operations (
  id uuid primary key, user_id uuid not null, command jsonb not null,
  message text not null, revision bigint not null, created_at timestamptz not null default now()
);
create table public.game_login_limits (bucket text primary key, attempts integer not null, reset_at timestamptz not null);
alter table public.game_worlds enable row level security;
alter table public.game_members enable row level security;
alter table public.game_operations enable row level security;
alter table public.game_login_limits enable row level security;
create function public.game_is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.game_members where user_id = auth.uid() and expires_at > now());
$$;
revoke all on function public.game_is_member() from public;
grant execute on function public.game_is_member() to authenticated;
create policy world_read on public.game_worlds for select to authenticated using (public.game_is_member());
create policy member_read on public.game_members for select to authenticated using (user_id = auth.uid());
revoke all on public.game_worlds, public.game_members, public.game_operations, public.game_login_limits from anon, authenticated;
grant select(id, revision, data, updated_at) on public.game_worlds to authenticated;
grant select on public.game_members to authenticated;
grant all on public.game_worlds, public.game_members, public.game_operations, public.game_login_limits to service_role;
-- Global limit cannot be bypassed by creating new anonymous users or spoofing an IP.
-- Failed and successful password submissions both count (10 / 15 minutes, shared).
create function public.game_login_slot() returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.game_login_limits values ('shared', 1, now() + interval '15 minutes')
  on conflict(bucket) do update set attempts = case when game_login_limits.reset_at <= now() then 1 else game_login_limits.attempts + 1 end,
    reset_at = case when game_login_limits.reset_at <= now() then now() + interval '15 minutes' else game_login_limits.reset_at end
  returning attempts into n;
  return n <= 10;
end;
$$;
-- Serialize CAS and deduplication under one row lock. Retried operation IDs never pay twice.
create function public.game_commit(p_user uuid, p_operation uuid, p_command jsonb, p_expected bigint, p_data jsonb, p_holds jsonb, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.game_worlds; op public.game_operations;
begin
  if not exists(select 1 from public.game_members where user_id = p_user and expires_at > now()) then raise exception 'unauthorized' using errcode = '42501'; end if;
  select * into w from public.game_worlds where id = 'home' for update;
  select * into op from public.game_operations where id = p_operation;
  if found then
    if op.user_id <> p_user or op.command <> p_command then raise exception 'operation mismatch'; end if;
    return jsonb_build_object('status','duplicate','message',op.message);
  end if;
  if w.revision <> p_expected then return jsonb_build_object('status','conflict'); end if;
  if p_data is null or octet_length(p_data::text) > 2000000 then raise exception 'invalid snapshot'; end if;
  if p_command->>'type' = 'initialize' and w.data is not null then return jsonb_build_object('status','conflict'); end if;
  update public.game_worlds set data=p_data, holds=p_holds, revision=revision+1, updated_at=clock_timestamp(),
    imported_by=case when w.data is null then p_user else imported_by end where id='home';
  insert into public.game_operations(id,user_id,command,message,revision) values(p_operation,p_user,p_command,p_message,w.revision+1);
  return jsonb_build_object('status','ok','message',p_message);
end;
$$;
revoke all on function public.game_login_slot(), public.game_commit(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.game_login_slot(), public.game_commit(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) to service_role;
-- Realtime broadcasts only rows the subscriber may read under RLS.
alter publication supabase_realtime add table public.game_worlds;
