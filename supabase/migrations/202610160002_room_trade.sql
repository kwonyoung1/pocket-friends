-- Additive backup before the first room-coordinate upgrade. Safe to run repeatedly.
begin;
create table if not exists public.game_room_backups(
 world_id text primary key,revision bigint not null,data jsonb not null,backed_up_at timestamptz not null default now()
);
alter table public.game_room_backups enable row level security;
revoke all on public.game_room_backups from public,anon,authenticated;
grant select,insert on public.game_room_backups to service_role;
create or replace function public.game_commit_room(
 p_user uuid,p_operation uuid,p_command jsonb,p_expected bigint,p_data jsonb,p_holds jsonb,p_message text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.game_worlds; result jsonb;
begin
 select * into w from public.game_worlds where id='home' for update;
 if w.data is not null and w.revision=p_expected and w.data #> '{world,roomVersion}' is null and p_data #> '{world,roomVersion}'='1'::jsonb then
  insert into public.game_room_backups(world_id,revision,data) values(w.id,w.revision,w.data) on conflict do nothing;
 end if;
 result:=public.game_commit_adventure(p_user,p_operation,p_command,p_expected,p_data,p_holds,p_message);
 return result;
end $$;
revoke all on function public.game_commit_room(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.game_commit_room(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) to service_role;
commit;
