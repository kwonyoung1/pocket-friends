-- Preserve existing sessions; only new starts use rule version 5.
create or replace function public.treasure_start(p_user uuid,p_request uuid,p_seed bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.treasure_sessions;
begin
 if not exists(select 1 from public.game_members where user_id=p_user and expires_at>now()) then raise exception 'unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,419));
 select * into s from public.treasure_sessions where user_id=p_user and request_id=p_request;
 if found then return to_jsonb(s); end if;
 if exists(select 1 from public.treasure_sessions where user_id=p_user and created_at>clock_timestamp()-interval '10 seconds') then raise exception '잠시 후 새 도전을 시작해 주세요.'; end if;
 if not exists(select 1 from public.game_worlds where id='home' and data->'world' is not null) then raise exception '먼저 기존 공유 월드에 입장해 주세요.'; end if;
 insert into public.treasure_sessions(user_id,request_id,seed,rules) values(p_user,p_request,p_seed,5) returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.treasure_start(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.treasure_start(uuid,uuid,bigint) to service_role;
