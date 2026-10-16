import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { createGameHandler } from './server'
import type { CloudRepository } from './server'
import type { ServerWorld, Holds, GameCommand } from './protocol'
import { applyCommand, freshWorld, importWorld } from './engine'
import { beginGesture, endGesture } from '../interaction'
import { tick } from '../game'
import {wordById} from '../words/bank'
import { startExpedition, world } from '../progression/model'
const pc = '10000000-0000-4000-8000-000000000001',
  mobile = '10000000-0000-4000-8000-000000000002'
const now = Date.parse('2026-10-15T03:00:00Z')
let at = now
const db = new PGlite()
let repo: CloudRepository
let handler: ReturnType<typeof createGameHandler>
const secret = crypto.randomUUID() // not the user's actual password
async function reset() {
  at = now
  await db.exec(
    "reset role; delete from game_adventure_backups; delete from game_upgrade_backups; delete from game_operations; delete from game_members; delete from game_login_limits; update game_worlds set data=null, revision=0, holds='{}', imported_by=null;",
  )
}
async function call(user: string | null, body: unknown) {
  return handler(
    new Request('https://project.supabase.co/functions/v1/game', {
      method: 'POST',
      headers: {
        origin: 'https://example.test',
        ...(user ? { authorization: `Bearer ${user}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...(body as object), clientVersion: 5 }),
    }),
  )
}
async function login(user: string) {
  const r = await call(user, { action: 'login', password: secret })
  expect(r.status).toBe(200)
}
async function command(
  user: string,
  c: unknown,
  operation = crypto.randomUUID(),
) {
  const response = await call(user, {
    action: 'command',
    operation,
    command: c,
  })
  return { response, body: await response.json(), operation }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values('${pc}'),('${mobile}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create publication supabase_realtime;`)
  await db.exec(
    readFileSync('supabase/migrations/202610150001_cloud_world.sql', 'utf8'),
  )
  await db.exec(
    readFileSync('supabase/migrations/202610150002_life_backup.sql', 'utf8'),
  )
  await db.exec(readFileSync('supabase/migrations/202610160001_adventure.sql','utf8'))
  repo = {
    async loginSlot() {
      return (await db.query<{ ok: boolean }>('select game_login_slot() as ok'))
        .rows[0].ok
    },
    async authorize(user) {
      return (
        (
          await db.query(
            'select 1 from game_members where user_id=$1 and expires_at>now()',
            [user],
          )
        ).rows.length > 0
      )
    },
    async enroll(user) {
      await db.query(
        "insert into game_members values($1,now()+interval '7 days') on conflict(user_id) do update set expires_at=excluded.expires_at",
        [user],
      )
    },
    async revoke(user) {
      await db.query('delete from game_members where user_id=$1', [user])
    },
    async load() {
      return (
        await db.query<ServerWorld>("select * from game_worlds where id='home'")
      ).rows[0]
    },
    async commit(user, operation, c, expected, data, holds: Holds, message) {
      return (
        await db.query<{
          result: { status: 'ok' | 'duplicate' | 'conflict'; message: string }
        }>(
          `select ${data && typeof data === 'object' && 'world' in data && (data as {world?:{adventureVersion?:number}}).world?.adventureVersion ? 'game_commit_adventure' : data && typeof data === 'object' && 'world' in data && (data as { world?: { expansion?: unknown } }).world?.expansion ? 'game_commit_expansion' : 'game_commit'}($1,$2,$3::jsonb,$4,$5::jsonb,$6::jsonb,$7) result`,
          [
            user,
            operation,
            JSON.stringify(c),
            expected,
            data === null ? null : JSON.stringify(data),
            JSON.stringify(holds),
            message,
          ],
        )
      ).rows[0].result
    },
  }
  handler = createGameHandler({
    repository: repo,
    user: async (token) => ([pc, mobile].includes(token) ? token : null),
    password: () => secret,
    origins: ['https://example.test'],
    now: () => at,
    wait: async (ms) => {
      at += ms
    },
  })
}, 30000)
afterAll(async () => {
  await db.close()
})
describe.sequential(
  'server authentication and real PostgreSQL transactions',
  () => {
    it('rejects unauthenticated access, wrong password, and applies the global attempt limit', async () => {
      await reset()
      expect((await call(null, { action: 'status' })).status).toBe(401)
      expect((await call(pc, { action: 'status' })).status).toBe(403)
      for (let i = 0; i < 10; i++)
        expect(
          (await call(pc, { action: 'login', password: 'wrong' })).status,
        ).toBe(403)
      expect(
        (await call(mobile, { action: 'login', password: secret })).status,
      ).toBe(429)
      expect(await repo.authorize(pc)).toBe(false)
    })
    it('RLS hides the world before membership and denies all client writes even after login', async () => {
      await reset()
      await db.exec(
        `set role authenticated; set "request.jwt.claim.sub"='${pc}';`,
      )
      expect(
        (await db.query('select data from game_worlds')).rows,
      ).toHaveLength(0)
      await expect(
        db.query('update game_worlds set revision=999'),
      ).rejects.toThrow(/permission denied/)
      await expect(db.query('select game_login_slot()')).rejects.toThrow(
        /permission denied/,
      )
      await expect(db.query('select * from game_operations')).rejects.toThrow(
        /permission denied/,
      )
      await db.exec('reset role')
      await login(pc)
      await db.exec(
        `set role authenticated; set "request.jwt.claim.sub"='${pc}';`,
      )
      expect(
        (await db.query('select data from game_worlds')).rows,
      ).toHaveLength(1)
      await expect(db.query('select holds from game_worlds')).rejects.toThrow(
        /permission denied/,
      )
      await expect(
        db.query("select game_commit($1,$2,'{}',0,'{}','{}','x')", [
          pc,
          crypto.randomUUID(),
        ]),
      ).rejects.toThrow(/permission denied/)
      await db.exec('reset role')
    })
    it('imports once, preserves photos, original coins and in-flight expeditions, and retries import safely', async () => {
      await reset()
      await login(pc)
      await login(mobile)
      const old = freshWorld(now)
      world(old).coins = 987
      old.friends[0].photo = 'data:image/png;base64,AAAA'
      startExpedition(old, 'bibi', 'forest', now - 20 * 60000)
      const init = await command(pc, {
        type: 'initialize',
        source: 'local',
        data: old,
      })
      expect(init.response.status).toBe(200)
      expect(init.body.row.data.world.coins).toBe(987)
      expect(init.body.row.data.friends[0].photo).toBe(old.friends[0].photo)
      expect(init.body.row.data.world.jobs).toEqual(old.world!.jobs)
      expect(init.body.row.data.friends[1].growth.awayJobId).toBe(
        old.world!.jobs[0].id,
      )
      const retry = await command(
        pc,
        { type: 'initialize', source: 'local', data: old },
        init.operation,
      )
      expect(retry.body.row.revision).toBe(1)
      expect(
        (await command(mobile, { type: 'initialize', source: 'fresh' }))
          .response.status,
      ).toBe(409)
      expect((await repo.load()).data!.world!.coins).toBe(987)
      expect(world(old).coins).toBe(987)
    })
    it('two devices see the same wallet; concurrent buys and duplicate operation IDs cannot double spend', async () => {
      await reset()
      await login(pc)
      await login(mobile)
      const old = freshWorld(now)
      world(old).coins = 15
      await command(pc, { type: 'initialize', source: 'local', data: old })
      const [a, b] = await Promise.all([
        command(pc, { type: 'buy', id: 'snack' }),
        command(mobile, { type: 'buy', id: 'snack' }),
      ])
      expect(a.response.status).toBe(200)
      expect(b.response.status).toBe(200)
      let shared = await repo.load()
      expect(shared.data!.world!.coins).toBe(0)
      expect(shared.data!.world!.inventory.snack).toBe(1)
      await command(pc, { type: 'buy', id: 'snack' }, a.operation)
      shared = await repo.load()
      expect(shared.data!.world!.inventory.snack).toBe(1)
      const phone = await (await call(mobile, { action: 'status' })).json()
      expect(phone.row.data.world.coins).toBe(0)
    })
    it('attendance and expedition completion are atomic and clients cannot inject rewards or time', async () => {
      await reset()
      await login(pc)
      await login(mobile)
      await command(pc, { type: 'initialize', source: 'fresh' })
      await Promise.all([
        command(pc, { type: 'attendance' }),
        command(mobile, { type: 'attendance' }),
      ])
      expect((await repo.load()).data!.world!.coins).toBe(330)
      const started = await command(pc, {
        type: 'expedition',
        friendId: 'momo',
        id: 'forest',
        result: { coins: 9999999 },
        now: now + 99999999,
      })
      expect(
        started.body.row.data.world.jobs[0].result.coins,
      ).toBeGreaterThanOrEqual(120)
      expect(started.body.row.data.world.jobs[0].startedAt).toBe(now)
      at += 31 * 60000
      await Promise.all([
        command(pc, { type: 'refresh' }),
        command(mobile, { type: 'refresh' }),
      ])
      const returned = await repo.load()
      expect(returned.data!.world!.coins).toBe(
        330 + started.body.row.data.world.jobs[0].result.coins,
      )
      expect(returned.data!.friends[0].growth!.explorations).toBe(1)
    })
    it('server times special petting, shares cooldowns, and can replay a consumed gesture receipt', async () => {
      await reset()
      await login(pc)
      await command(pc, { type: 'initialize', source: 'fresh' })
      const holdId = crypto.randomUUID()
      expect(
        (await command(pc, { type: 'pet-special', friendId: 'momo', holdId }))
          .response.status,
      ).toBe(400)
      await command(pc, { type: 'hold-start', friendId: 'momo', holdId })
      const special = await command(pc, {
        type: 'pet-special',
        friendId: 'momo',
        holdId,
      })
      expect(at - now).toBeGreaterThanOrEqual(2000)
      expect(special.body.row.data.friends[0].stats.affection).toBe(23)
      await command(pc, { type: 'hold-cancel', friendId: 'momo', holdId })
      const replay = await command(
        pc,
        { type: 'pet-special', friendId: 'momo', holdId },
        special.operation,
      )
      expect(replay.response.status).toBe(200)
      expect(replay.body.row.data.friends[0].stats.affection).toBe(23)
      await command(pc, { type: 'care', friendId: 'momo', action: 'pet' })
      expect((await repo.load()).data!.friends[0].stats.affection).toBe(23)
    })
    it('logout revokes membership, including access with the old still-valid JWT', async () => {
      await reset()
      await login(pc)
      expect((await call(pc, { action: 'logout' })).status).toBe(200)
      expect((await call(pc, { action: 'status' })).status).toBe(403)
      await db.exec(
        `set role authenticated; set "request.jwt.claim.sub"='${pc}';`,
      )
      expect(
        (await db.query('select data from game_worlds')).rows,
      ).toHaveLength(0)
      await db.exec('reset role')
    })
  },
)
describe('migration and client visual isolation', () => {
  it('server verifies treasure value and food quantities under concurrent commands and receipt retries',async()=>{
    await reset();await login(pc);await login(mobile)
    const old=freshWorld(now);old.world!.inventory['treasure-diamond']=1;old.world!.inventory['strawberry-milk']=2;old.friends[0].stats.hunger=0;old.friends[0].stats.happiness=0
    await command(pc,{type:'initialize',source:'local',data:old})
    const c={type:'sell',id:'treasure-diamond',price:999999,quantity:100}
    const [a]=await Promise.all([command(pc,c),command(mobile,c)])
    await command(pc,c,a.operation)
    expect((await repo.load()).data!.world!.coins).toBe(3300)
    expect((await repo.load()).data!.world!.inventory['treasure-diamond']).toBe(0)
    await Promise.all([command(pc,{type:'use',id:'strawberry-milk',friendId:'momo'}),command(mobile,{type:'use',id:'strawberry-milk',friendId:'momo'})])
    const final=(await repo.load()).data!
    expect(final.world!.inventory['strawberry-milk']).toBe(1)
    expect(final.friends[0].stats.hunger).toBe(15);expect(final.friends[0].stats.happiness).toBe(23)
  })
  it('new SQL is repeatable, backs up the untouched world atomically, and protects backup reads', async () => {
    await reset();await login(pc)
    const source=freshWorld(now);source.friends[0].photo='data:image/png;base64,AAAA';source.world!.coins=876
    await command(pc,{type:'initialize',source:'local',data:source})
    const before=await repo.load()
    const sql=readFileSync('supabase/migrations/202610160001_adventure.sql','utf8')
    await db.exec(sql);await db.exec(sql)
    expect(await repo.load()).toEqual(before)
    await command(pc,{type:'refresh'})
    const backup=(await db.query<{data:unknown}>('select data from game_adventure_backups')).rows
    expect(backup).toHaveLength(1);expect(backup[0].data).toEqual(before.data)
    await command(pc,{type:'refresh'});expect((await db.query('select * from game_adventure_backups')).rows).toHaveLength(1)
    await db.exec('set role authenticated');await expect(db.query('select * from game_adventure_backups')).rejects.toThrow(/permission denied/);await db.exec('reset role')
  })
  it('two devices share one quiz and grade each question once, including concurrent final payouts and retries', async () => {
    await reset();await login(pc);await login(mobile);await command(pc,{type:'initialize',source:'fresh'})
    await Promise.all([command(pc,{type:'word-start',mode:'reward'}),command(mobile,{type:'word-start',mode:'reward'})])
    let r=(await repo.load()).data!.world!.words!.round!
    const session=r.id,first=r.questions[0],answer={type:'word-answer',mode:'reward',sessionId:session,wordId:first.wordId,answer:wordById[first.wordId].acceptedAnswers[0]}
    await Promise.all([command(pc,answer),command(mobile,answer)])
    r=(await repo.load()).data!.world!.words!.round!;expect(r.index).toBe(1)
    for(let i=1;i<29;i++){const q=r.questions[r.index];await command(pc,{...answer,wordId:q.wordId,answer:wordById[q.wordId].acceptedAnswers[0]});r=(await repo.load()).data!.world!.words!.round!}
    const last=r.questions[29],c={...answer,wordId:last.wordId,answer:wordById[last.wordId].acceptedAnswers[0],reward:99999}
    const [a,b]=await Promise.all([command(pc,c),command(mobile,c)])
    expect(a.response.status).toBe(200);expect(b.response.status).toBe(200)
    await command(pc,c,a.operation)
    const final=(await repo.load()).data!
    expect(final.world!.coins).toBe(600);expect(final.world!.words!.round!.reward).toBe(300)
    expect(final.world!.ledger.filter(e=>e.reason==='영단어 탐험 완료')).toHaveLength(1)
    await command(mobile,{type:'word-start',mode:'reward'});expect((await repo.load()).data!.world!.words!.round!.id).toBe(session)
  })
  it('manual rest is atomic across devices, uses server time and cannot reset through a refresh', async () => {
    await reset();await login(pc);await login(mobile)
    const source=freshWorld(now);source.friends[0].stats.energy=20
    await command(pc,{type:'initialize',source:'local',data:source})
    const c={type:'care',action:'rest',friendId:'momo',now:now+86400000}
    await Promise.all([command(pc,c),command(mobile,c)])
    expect((await repo.load()).data!.friends[0].stats.energy).toBe(40)
    await command(mobile,{type:'refresh'});expect((await repo.load()).data!.friends[0].lastRestRewardAt).toBe(now)
    at=now+4*3600000-1;await command(pc,c)
    expect((await repo.load()).data!.friends[0].lastRestRewardAt).toBe(now)
    at++;await command(mobile,c)
    expect((await repo.load()).data!.friends[0].lastRestRewardAt).toBe(at)
  })
  it('server time and atomic commits enforce six-hour pet rewards across two devices and stale clients', async () => {
    await reset(); await login(pc); await login(mobile)
    const old = freshWorld(now); old.friends[0].stats.happiness = 40
    await command(pc, {type:'initialize',source:'local',data:old})
    const results=await Promise.all([command(pc,{type:'care',friendId:'momo',action:'pet'}),command(mobile,{type:'care',friendId:'momo',action:'pet'})])
    expect(results.every(r=>r.response.status===200)).toBe(true)
    let f=(await repo.load()).data!.friends[0]
    expect(f.stats.affection).toBe(21); expect(f.stats.happiness).toBe(42); expect(f.growth!.xp).toBe(1)
    expect(f.lastPetRewardAt).toBe(now); expect(f.petRewardAfter).toBe(now+6*3600000)
    const fakeTime=await call(mobile,{action:'command',operation:crypto.randomUUID(),command:{type:'care',friendId:'momo',action:'pet',now:now+86400000}})
    expect((await fakeTime.json()).serverTime).toBe(now)
    expect((await repo.load()).data!.friends[0].stats.affection).toBe(21)
    at=now+6*3600000-1
    await command(mobile,{type:'care',friendId:'momo',action:'pet'})
    expect((await repo.load()).data!.friends[0].stats.affection).toBe(21)
    at++
    await command(mobile,{type:'care',friendId:'momo',action:'pet'})
    f=(await repo.load()).data!.friends[0]; expect(f.stats.affection).toBe(22)
    expect(f.growth!.xp).toBe(2); expect(f.lastPetRewardAt).toBe(at)
    const stale = new Request('https://project.supabase.co/functions/v1/game', {method:'POST',headers:{origin:'https://example.test',authorization:`Bearer ${pc}`,'Content-Type':'application/json'},body:JSON.stringify({action:'command',operation:crypto.randomUUID(),clientVersion:3,command:{type:'care',friendId:'momo',action:'pet'}})})
    expect((await handler(stale)).status).toBe(409)
    await db.exec(`update game_members set expires_at=now()-interval '1 second'`)
    expect((await call(pc,{action:'status'})).status).toBe(403)
    expect((await command(pc,{type:'care',friendId:'momo',action:'pet'})).response.status).toBe(403)
  })
  it('preserves v1 originals without awarding additional coins and rejects malformed imports', () => {
    const old = freshWorld(now)
    const raw = JSON.stringify(old)
    const imported = importWorld(old, now + 1000)
    expect(world(imported).coins).toBe(300)
    expect(JSON.stringify(old)).toBe(raw)
    expect(() => importWorld({ version: 2, friends: [] }, now)).toThrow()
  })
  it('local animation and held petting cannot mint rewards in cloud mode', () => {
    const s = freshWorld(now),
      f = s.friends[0]
    s.friends.forEach((p) => {
      p.remoteAuthoritative = true
    })
    const originalStats = structuredClone(s.friends.map((p) => p.stats))
    beginGesture(f, 1, { x: 10, y: 10 }, 'head', now, 'mouse')
    let attempts = 0
    tick(
      s.friends,
      now + 2100,
      0.1,
      () => {},
      () => {
        attempts++
      },
      true,
    )
    tick(
      s.friends,
      now + 3100,
      0.1,
      () => {},
      () => {
        attempts++
      },
      true,
    )
    endGesture(f, 1, now + 3200)
    expect(attempts).toBe(1)
    expect(s.friends.map((p) => p.stats)).toEqual(originalStats)
    expect(f.growth!.xp).toBe(0)
  })
  it('validates commands and blocks arbitrary snapshot writes', async () => {
    await reset()
    await login(pc)
    await command(pc, { type: 'initialize', source: 'fresh' })
    expect(
      (await command(pc, { type: 'replace', data: { coins: 999 } })).response
        .status,
    ).not.toBe(200)
    expect((await repo.load()).data!.world!.coins).toBe(300)
    const s = freshWorld(now),
      before = JSON.stringify(s)
    const move: GameCommand = {
      type: 'drop',
      friendId: 'momo',
      holdId: 'a',
      x: -100,
      y: -100,
    }
    const r = applyCommand(
      s,
      { momo: { id: 'a', user: pc, at: now } },
      move,
      pc,
      now,
    )
    expect(r.save.friends[0].x).toBeGreaterThanOrEqual(50)
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe.sequential(
  'expansion upgrades use actual PostgreSQL backups and atomic commands',
  () => {
    it('backs up the existing world exactly once and rejects old clients after upgrade', async () => {
      await reset()
      await login(pc)
      const old = freshWorld(now)
      old.world!.coins = 4567
      old.friends[0].photo = 'data:image/png;base64,AAAA'
      await db.query(
        "update game_worlds set data=$1::jsonb,revision=8 where id='home'",
        [JSON.stringify(old)],
      )
      const upgraded = await command(pc, { type: 'refresh' })
      expect(upgraded.response.status).toBe(200)
      const backup = await db.query<{ data: unknown; revision: number }>(
        'select data,revision from game_upgrade_backups',
      )
      expect(backup.rows[0].data).toEqual(old)
      expect(Number(backup.rows[0].revision)).toBe(8)
      await command(pc, { type: 'attendance' })
      expect(
        (await db.query('select * from game_upgrade_backups')).rows,
      ).toHaveLength(1)
      const stale = await handler(
        new Request('https://project.supabase.co/functions/v1/game', {
          method: 'POST',
          headers: {
            origin: 'https://example.test',
            authorization: `Bearer ${pc}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'command',
            operation: crypto.randomUUID(),
            command: { type: 'buy', id: 'snack' },
          }),
        }),
      )
      expect(stale.status).toBe(409)
      expect((await repo.load()).data!.world!.coins).toBe(4597)
      await db.exec(
        `set role authenticated; set "request.jwt.claim.sub"='${pc}'`,
      )
      await expect(
        db.query('select * from game_upgrade_backups'),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query("select game_commit_expansion($1,$2,'{}',0,'{}','{}','x')", [
          pc,
          crypto.randomUUID(),
        ]),
      ).rejects.toThrow(/permission denied/)
      await db.exec('reset role')
    })
    it('concurrent adoption and bath commands cannot double spend or double start', async () => {
      await reset()
      await login(pc)
      await login(mobile)
      const old = freshWorld(now)
      old.world!.coins = 10000
      await command(pc, { type: 'initialize', source: 'local', data: old })
      await Promise.all([
        command(pc, { type: 'adopt', id: 'lulu' }),
        command(mobile, { type: 'adopt', id: 'lulu' }),
      ])
      let row = await repo.load()
      expect(row.data!.friends).toHaveLength(5)
      expect(row.data!.world!.coins).toBe(0)
      await Promise.all([
        command(pc, { type: 'bath', friendId: 'lulu' }),
        command(mobile, { type: 'bath', friendId: 'lulu' }),
      ])
      row = await repo.load()
      expect(row.data!.friends[4].life!.bathCount).toBe(1)
      at += 1800001
      await Promise.all([
        command(pc, { type: 'refresh' }),
        command(mobile, { type: 'refresh' }),
      ])
      row = await repo.load()
      expect(row.data!.friends[4].life!.bath).toBeUndefined()
      expect(row.data!.friends[4].stats.hygiene).toBeGreaterThan(99)
    })
    it('server ignores injected bath times and rename cooldowns and conserves furniture across device races', async () => {
      await reset()
      await login(pc)
      await login(mobile)
      const old = freshWorld(now)
      old.world!.inventory.plant = 1
      await command(pc, { type: 'initialize', source: 'local', data: old })
      await command(pc, {
        type: 'bath',
        friendId: 'momo',
        endsAt: now,
        now: now + 99999999,
      })
      expect((await repo.load()).data!.friends[0].life!.bath!.endsAt).toBe(
        now + 1800000,
      )
      await command(pc, {
        type: 'rename',
        friendId: 'bibi',
        name: '새 이름',
        lastRenameAt: 0,
      })
      await command(mobile, {
        type: 'rename',
        friendId: 'bibi',
        name: '무한 변경',
        now: now + 999999999,
      })
      expect((await repo.load()).data!.friends[1].name).toBe('새 이름')
      await Promise.all([
        command(pc, { type: 'place', itemId: 'plant', x: 530, y: 390 }),
        command(mobile, { type: 'place', itemId: 'plant', x: 450, y: 390 }),
      ])
      const row = await repo.load()
      expect(row.data!.world!.inventory.plant).toBe(0)
      expect(row.data!.world!.expansion!.placements).toHaveLength(1)
    })
  },
)

describe.sequential('special human gifts are atomic and do not replace an existing world',()=>{
 it('two devices claim both gifts once without spending coins or changing existing progression',async()=>{
  await reset();await login(pc);await login(mobile)
  const old=freshWorld(now);old.world!.coins=9876;old.friends[0].photo='data:image/png;base64,AAAA'
  await command(pc,{type:'initialize',source:'local',data:old})
  const op=crypto.randomUUID();await Promise.all([command(pc,{type:'claim-special-friends'},op),command(mobile,{type:'claim-special-friends'})]);await command(pc,{type:'claim-special-friends'},op)
  const row=await repo.load();expect(row.data!.friends).toHaveLength(6);expect(row.data!.world!.coins).toBe(9876);expect(row.data!.friends[0].photo).toBe(old.friends[0].photo)
  expect(row.data!.friends.filter(f=>f.id==='special-boy')).toHaveLength(1);expect(row.data!.friends.filter(f=>f.id==='special-girl')).toHaveLength(1)
  await command(pc,{type:'rename',friendId:'special-boy',name:'우리 소년'});await command(mobile,{type:'expedition',friendId:'special-girl',id:'forest'})
  const updated=await repo.load();expect(updated.data!.friends.find(f=>f.id==='special-boy')!.name).toBe('우리 소년');expect(updated.data!.friends.find(f=>f.id==='special-girl')!.growth!.awayJobId).toBeTruthy()
  expect((await importWorld(updated.data,now)).friends).toHaveLength(6)
 })
 it('rejects previous-version writers after the gift without removing the special friends',async()=>{
  await reset();await login(pc);await command(pc,{type:'initialize',source:'fresh'});await command(pc,{type:'claim-special-friends'})
  const request=new Request('https://project.supabase.co/functions/v1/game',{method:'POST',headers:{origin:'https://example.test',authorization:`Bearer ${pc}`,'Content-Type':'application/json'},body:JSON.stringify({action:'command',operation:crypto.randomUUID(),clientVersion:2,command:{type:'refresh'}})})
  expect((await handler(request)).status).toBe(409);expect((await repo.load()).data!.friends).toHaveLength(6)
 })
})
