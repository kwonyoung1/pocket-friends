-- Additive upgrade. Never reset or replace the existing home world.
begin;
create table if not exists public.game_upgrade_backups (
 world_id text primary key, revision bigint not null, data jsonb not null,
 backed_up_at timestamptz not null default now()
);
alter table public.game_upgrade_backups enable row level security;
revoke all on public.game_upgrade_backups from public, anon, authenticated;
grant select,insert on public.game_upgrade_backups to service_role;
create or replace function public.game_commit_expansion(
 p_user uuid,p_operation uuid,p_command jsonb,p_expected bigint,p_data jsonb,p_holds jsonb,p_message text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare current_world public.game_worlds; result jsonb;
begin
 select * into current_world from public.game_worlds where id='home' for update;
 -- The original snapshot and new snapshot commit in one transaction. Concurrent devices
 -- cannot overwrite the backup or grant the same reward twice.
 if current_world.data is not null and current_world.data #> '{world,expansion}' is null then
  insert into public.game_upgrade_backups(world_id,revision,data)
  values(current_world.id,current_world.revision,current_world.data) on conflict do nothing;
 end if;
 result := public.game_commit(p_user,p_operation,p_command,p_expected,p_data,p_holds,p_message);
 return result;
end $$;
revoke all on function public.game_commit_expansion(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.game_commit_expansion(uuid,uuid,jsonb,bigint,jsonb,jsonb,text) to service_role;
commit;
