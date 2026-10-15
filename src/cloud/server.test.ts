import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { createGameHandler } from './server'
import type { CloudRepository } from './server'
import type { ServerWorld, Holds, GameCommand } from './protocol'
import { applyCommand, freshWorld, importWorld } from './engine'
import { beginGesture, endGesture } from '../interaction'
import { tick } from '../game'
import { startExpedition, world } from '../progression/model'
const pc = '10000000-0000-4000-8000-000000000001', mobile = '10000000-0000-4000-8000-000000000002'
const now = Date.parse('2026-10-15T03:00:00Z')
let at = now
const db = new PGlite()
let repo: CloudRepository
let handler: ReturnType<typeof createGameHandler>
const secret = crypto.randomUUID() // not the user's actual password
async function reset() {
  at = now
  await db.exec("reset role; delete from game_operations; delete from game_members; delete from game_login_limits; update game_worlds set data=null, revision=0, holds='{}', imported_by=null;")
}
async function call(user: string | null, body: unknown) {
  return handler(new Request('https://project.supabase.co/functions/v1/game', { method: 'POST', headers: { origin: 'https://example.test', ...(user ? { authorization: `Bearer ${user}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
}
async function login(user: string) { const r = await call(user, { action: 'login', password: secret }); expect(r.status).toBe(200) }
async function command(user: string, c: unknown, operation = crypto.randomUUID()) {
  const response = await call(user, { action: 'command', operation, command: c }); return { response, body: await response.json(), operation }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values('${pc}'),('${mobile}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create publication supabase_realtime;`)
  await db.exec(readFileSync('supabase/migrations/202610150001_cloud_world.sql', 'utf8'))
  repo = {
    async loginSlot() { return (await db.query<{ ok: boolean }>('select game_login_slot() as ok')).rows[0].ok },
    async authorize(user) { return (await db.query('select 1 from game_members where user_id=$1 and expires_at>now()', [user])).rows.length > 0 },
    async enroll(user) { await db.query("insert into game_members values($1,now()+interval '7 days') on conflict(user_id) do update set expires_at=excluded.expires_at", [user]) },
    async revoke(user) { await db.query('delete from game_members where user_id=$1', [user]) },
    async load() { return (await db.query<ServerWorld>("select * from game_worlds where id='home'")).rows[0] },
    async commit(user, operation, c, expected, data, holds: Holds, message) {
      return (await db.query<{ result: { status: 'ok' | 'duplicate' | 'conflict'; message: string } }>('select game_commit($1,$2,$3::jsonb,$4,$5::jsonb,$6::jsonb,$7) result', [user, operation, JSON.stringify(c), expected, data === null ? null : JSON.stringify(data), JSON.stringify(holds), message])).rows[0].result
    },
  }
  handler = createGameHandler({ repository: repo, user: async token => [pc, mobile].includes(token) ? token : null, password: () => secret, origins: ['https://example.test'], now: () => at, wait: async ms => { at += ms } })
}, 30000)
afterAll(async () => { await db.close() })
describe.sequential('server authentication and real PostgreSQL transactions', () => {
  it('rejects unauthenticated access, wrong password, and applies the global attempt limit', async () => {
    await reset()
    expect((await call(null, { action: 'status' })).status).toBe(401)
    expect((await call(pc, { action: 'status' })).status).toBe(403)
    for (let i = 0; i < 10; i++) expect((await call(pc, { action: 'login', password: 'wrong' })).status).toBe(403)
    expect((await call(mobile, { action: 'login', password: secret })).status).toBe(429)
    expect(await repo.authorize(pc)).toBe(false)
  })
  it('RLS hides the world before membership and denies all client writes even after login', async () => {
    await reset()
    await db.exec(`set role authenticated; set "request.jwt.claim.sub"='${pc}';`)
    expect((await db.query('select data from game_worlds')).rows).toHaveLength(0)
    await expect(db.query("update game_worlds set revision=999")).rejects.toThrow(/permission denied/)
    await expect(db.query('select game_login_slot()')).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from game_operations')).rejects.toThrow(/permission denied/)
    await db.exec('reset role'); await login(pc)
    await db.exec(`set role authenticated; set "request.jwt.claim.sub"='${pc}';`)
    expect((await db.query('select data from game_worlds')).rows).toHaveLength(1)
    await expect(db.query('select holds from game_worlds')).rejects.toThrow(/permission denied/)
    await expect(db.query("select game_commit($1,$2,'{}',0,'{}','{}','x')", [pc, crypto.randomUUID()])).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
  it('imports once, preserves photos, original coins and in-flight expeditions, and retries import safely', async () => {
    await reset(); await login(pc); await login(mobile)
    const old = freshWorld(now); world(old).coins = 987; old.friends[0].photo = 'data:image/png;base64,AAAA'; startExpedition(old, 'bibi', 'forest', now - 20 * 60000)
    const init = await command(pc, { type: 'initialize', source: 'local', data: old })
    expect(init.response.status).toBe(200); expect(init.body.row.data.world.coins).toBe(987)
    expect(init.body.row.data.friends[0].photo).toBe(old.friends[0].photo)
    expect(init.body.row.data.world.jobs).toEqual(old.world!.jobs)
    expect(init.body.row.data.friends[1].growth.awayJobId).toBe(old.world!.jobs[0].id)
    const retry = await command(pc, { type: 'initialize', source: 'local', data: old }, init.operation)
    expect(retry.body.row.revision).toBe(1)
    expect((await command(mobile, { type: 'initialize', source: 'fresh' })).response.status).toBe(409)
    expect((await repo.load()).data!.world!.coins).toBe(987)
    expect(world(old).coins).toBe(987)
  })
  it('two devices see the same wallet; concurrent buys and duplicate operation IDs cannot double spend', async () => {
    await reset(); await login(pc); await login(mobile)
    const old = freshWorld(now); world(old).coins = 20
    await command(pc, { type: 'initialize', source: 'local', data: old })
    const [a, b] = await Promise.all([command(pc, { type: 'buy', id: 'snack' }), command(mobile, { type: 'buy', id: 'snack' })])
    expect(a.response.status).toBe(200); expect(b.response.status).toBe(200)
    let shared = await repo.load(); expect(shared.data!.world!.coins).toBe(0); expect(shared.data!.world!.inventory.snack).toBe(1)
    await command(pc, { type: 'buy', id: 'snack' }, a.operation)
    shared = await repo.load(); expect(shared.data!.world!.inventory.snack).toBe(1)
    const phone = await (await call(mobile, { action: 'status' })).json()
    expect(phone.row.data.world.coins).toBe(0)
  })
  it('attendance and expedition completion are atomic and clients cannot inject rewards or time', async () => {
    await reset(); await login(pc); await login(mobile); await command(pc, { type: 'initialize', source: 'fresh' })
    await Promise.all([command(pc, { type: 'attendance' }), command(mobile, { type: 'attendance' })])
    expect((await repo.load()).data!.world!.coins).toBe(330)
    const started = await command(pc, { type: 'expedition', friendId: 'momo', id: 'forest', result: { coins: 9999999 }, now: now + 99999999 })
    expect(started.body.row.data.world.jobs[0].result.coins).toBe(120)
    expect(started.body.row.data.world.jobs[0].startedAt).toBe(now)
    at += 31 * 60000
    await Promise.all([command(pc, { type: 'refresh' }), command(mobile, { type: 'refresh' })])
    const returned = await repo.load(); expect(returned.data!.world!.coins).toBe(450)
    expect(returned.data!.friends[0].growth!.explorations).toBe(1)
  })
  it('server times special petting, shares cooldowns, and can replay a consumed gesture receipt', async () => {
    await reset(); await login(pc); await command(pc, { type: 'initialize', source: 'fresh' })
    const holdId = crypto.randomUUID()
    expect((await command(pc, { type: 'pet-special', friendId: 'momo', holdId })).response.status).toBe(400)
    await command(pc, { type: 'hold-start', friendId: 'momo', holdId })
    const special = await command(pc, { type: 'pet-special', friendId: 'momo', holdId })
    expect(at - now).toBeGreaterThanOrEqual(2000)
    expect(special.body.row.data.friends[0].stats.affection).toBe(23)
    await command(pc, { type: 'hold-cancel', friendId: 'momo', holdId })
    const replay = await command(pc, { type: 'pet-special', friendId: 'momo', holdId }, special.operation)
    expect(replay.response.status).toBe(200); expect(replay.body.row.data.friends[0].stats.affection).toBe(23)
    await command(pc, { type: 'care', friendId: 'momo', action: 'pet' })
    expect((await repo.load()).data!.friends[0].stats.affection).toBe(23)
  })
  it('logout revokes membership, including access with the old still-valid JWT', async () => {
    await reset(); await login(pc)
    expect((await call(pc, { action: 'logout' })).status).toBe(200)
    expect((await call(pc, { action: 'status' })).status).toBe(403)
    await db.exec(`set role authenticated; set "request.jwt.claim.sub"='${pc}';`)
    expect((await db.query('select data from game_worlds')).rows).toHaveLength(0)
    await db.exec('reset role')
  })
})
describe('migration and client visual isolation', () => {
  it('preserves v1 originals without awarding additional coins and rejects malformed imports', () => {
    const old = freshWorld(now); const raw = JSON.stringify(old)
    const imported = importWorld(old, now + 1000)
    expect(world(imported).coins).toBe(300); expect(JSON.stringify(old)).toBe(raw)
    expect(() => importWorld({ version: 2, friends: [] }, now)).toThrow()
  })
  it('local animation and held petting cannot mint rewards in cloud mode', () => {
    const s = freshWorld(now), f = s.friends[0]
    s.friends.forEach(p => { p.remoteAuthoritative = true })
    const originalStats = structuredClone(s.friends.map(p => p.stats))
    beginGesture(f, 1, { x: 10, y: 10 }, 'head', now, 'mouse')
    let attempts = 0
    tick(s.friends, now + 2100, .1, () => {}, () => { attempts++ }, true)
    tick(s.friends, now + 3100, .1, () => {}, () => { attempts++ }, true)
    endGesture(f, 1, now + 3200)
    expect(attempts).toBe(1)
    expect(s.friends.map(p => p.stats)).toEqual(originalStats)
    expect(f.growth!.xp).toBe(0)
  })
  it('validates commands and blocks arbitrary snapshot writes', async () => {
    await reset(); await login(pc); await command(pc, { type: 'initialize', source: 'fresh' })
    expect((await command(pc, { type: 'replace', data: { coins: 999 } })).response.status).not.toBe(200)
    expect((await repo.load()).data!.world!.coins).toBe(300)
    const s = freshWorld(now), before = JSON.stringify(s)
    const move: GameCommand = { type: 'drop', friendId: 'momo', holdId: 'a', x: -100, y: -100 }
    const r = applyCommand(s, { momo: { id: 'a', user: pc, at: now } }, move, pc, now)
    expect(r.save.friends[0].x).toBeGreaterThanOrEqual(50)
    expect(JSON.stringify(s)).toBe(before)
  })
})
