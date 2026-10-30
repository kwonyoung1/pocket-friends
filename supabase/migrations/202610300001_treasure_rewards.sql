-- Additive migration. No world replacement, no changes to existing commands or Sichuan.
create table if not exists public.treasure_sessions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, seed bigint not null, rules integer not null default 4,
 created_at timestamptz not null default clock_timestamp(), cursor integer not null default 0,
 log_hash text, transcript jsonb, checkpoint jsonb, coins bigint, result jsonb, paid_at timestamptz,
 unique(user_id,request_id)
);
alter table public.treasure_sessions enable row level security;
revoke all on public.treasure_sessions from public,anon,authenticated;
grant select,insert,update on public.treasure_sessions to service_role;
create or replace function public.treasure_start(p_user uuid,p_request uuid,p_seed bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.treasure_sessions;
begin
 if not exists(select 1 from public.game_members where user_id=p_user and expires_at>now()) then raise exception 'unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,419));
 select * into s from public.treasure_sessions where user_id=p_user and request_id=p_request;
 if found then return to_jsonb(s); end if;
 if exists(select 1 from public.treasure_sessions where user_id=p_user and created_at>clock_timestamp()-interval '10 seconds') then raise exception '잠시 후 새 도전을 시작해 주세요.'; end if;
 if not exists(select 1 from public.game_worlds where id='home' and data->'world' is not null) then raise exception '먼저 기존 공유 월드에 입장해 주세요.'; end if;
 insert into public.treasure_sessions(user_id,request_id,seed) values(p_user,p_request,p_seed) returning * into s;
 return to_jsonb(s);
end $$;
create or replace function public.treasure_advance(p_user uuid,p_id uuid,p_cursor integer,p_hash text,p_log jsonb,p_checkpoint jsonb,p_complete boolean,p_coins bigint,p_result jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.treasure_sessions; w public.game_worlds; current_coins bigint;
begin
 if not exists(select 1 from public.game_members where user_id=p_user and expires_at>now()) then raise exception 'unauthorized'; end if;
 select * into s from public.treasure_sessions where id=p_id and user_id=p_user for update;
 if not found then raise exception 'unknown session'; end if;
 if s.log_hash is not null and s.log_hash<>p_hash then raise exception 'transcript mismatch'; end if;
 if s.coins is not null then return jsonb_build_object('status','paid','coins',s.coins,'result',s.result); end if;
 if s.cursor<>p_cursor then return jsonb_build_object('status','pending'); end if;
 if s.created_at<clock_timestamp()-interval '12 hours' or p_checkpoint->>'cursor' is null or (p_checkpoint->>'cursor')::integer<=p_cursor then raise exception 'invalid checkpoint'; end if;
 if p_complete then
  if (p_checkpoint->>'cursor')::integer<>jsonb_array_length(p_log->'turns') or p_coins<0 then raise exception 'invalid settlement'; end if;
  select * into w from public.game_worlds where id='home' for update;
  current_coins:=(w.data#>>'{world,coins}')::bigint;
  if current_coins is null then raise exception 'missing world'; end if;
  update public.game_worlds set data=jsonb_set(data,'{world,coins}',to_jsonb(current_coins+p_coins)),revision=revision+1,updated_at=clock_timestamp() where id='home';
 end if;
 update public.treasure_sessions set cursor=(p_checkpoint->>'cursor')::integer,log_hash=p_hash,transcript=p_log,checkpoint=p_checkpoint,
 coins=case when p_complete then p_coins else null end,result=case when p_complete then p_result else null end,paid_at=case when p_complete then clock_timestamp() else null end where id=p_id;
 return case when p_complete then jsonb_build_object('status','paid','coins',p_coins,'result',p_result) else jsonb_build_object('status','pending') end;
end $$;
revoke all on function public.treasure_start(uuid,uuid,bigint),public.treasure_advance(uuid,uuid,integer,text,jsonb,jsonb,boolean,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.treasure_start(uuid,uuid,bigint),public.treasure_advance(uuid,uuid,integer,text,jsonb,jsonb,boolean,bigint,jsonb) to service_role;
