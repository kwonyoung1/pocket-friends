import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createGameHandler } from '../../../src/cloud/server.ts'
import type { CloudRepository } from '../../../src/cloud/server.ts'
import type { Holds, ServerWorld } from '../../../src/cloud/protocol.ts'
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const checked = <T>({ data, error }: { data: T; error: unknown }): T => { if (error) throw Error((error as {code?:string}).code==='PGRST202' ? '업데이트용 SQL이 아직 적용되지 않았어요. 202610160001_adventure.sql을 SQL Editor에서 실행해 주세요. 기존 데이터는 변경하지 않았어요.' : '클라우드 데이터베이스 작업에 실패했어요. 설정과 연결을 확인해 주세요.'); return data }
const repository: CloudRepository = {
  async loginSlot() { return checked(await admin.rpc('game_login_slot')) as boolean },
  async authorize(user) { const row = checked(await admin.from('game_members').select('expires_at').eq('user_id', user).maybeSingle()); return !!row && Date.parse(row.expires_at) > Date.now() },
  async enroll(user) { checked(await admin.from('game_members').upsert({ user_id: user, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() })) },
  async revoke(user) { checked(await admin.from('game_members').delete().eq('user_id', user)) },
  async load() { return checked(await admin.from('game_worlds').select('*').eq('id', 'home').single()) as ServerWorld },
  async commit(user: string, operation: string, command: unknown, expected: number, data: unknown, holds: Holds, message: string) {
    return checked(await admin.rpc(data && typeof data === 'object' && 'world' in data && (data as {world?:{adventureVersion?:number}}).world?.adventureVersion ? 'game_commit_adventure' : data && typeof data === 'object' && 'world' in data && (data as {world?:{expansion?:unknown}}).world?.expansion ? 'game_commit_expansion' : 'game_commit', { p_user: user, p_operation: operation, p_command: command, p_expected: expected, p_data: data, p_holds: holds, p_message: message }))
  },
}
Deno.serve(createGameHandler({ repository, user: async token => { const { data, error } = await admin.auth.getUser(token); return error ? null : data.user?.id ?? null }, password: () => Deno.env.get('GAME_ACCESS_PASSWORD'), origins: (Deno.env.get('GAME_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean) }))
