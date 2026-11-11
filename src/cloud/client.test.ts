import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudClient } from './client'
import { freshWorld } from './engine'
import { worldPayload } from './transport'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'player' }, access_token: 'test' } } }) } }),
}))

describe('serialized cloud commands without background input locks', () => {
  let client: CloudClient
  let storage: Map<string, string>
  let requests: { body: { action?: string; full?: boolean; knownRevision?: number; operation: string; command: { type: string } }; resolve: (response: Response) => void }[]
  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) })
    requests = []
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise<Response>(resolve => requests.push({ body: JSON.parse(options.body), resolve }))))
    client = new CloudClient('https://test.supabase.co', 'public')
  })
  afterEach(() => { vi.unstubAllGlobals() })
  const flush = async () => { await vi.waitFor(() => expect(requests.length).toBeGreaterThan(0)) }
  const ok = (revision: number) => Response.json({ row: { id: 'home', revision, data: null }, serverTime: 1000 })

  it('keeps controls available throughout a background refresh', async () => {
    const job = client.send({ type: 'refresh' })
    await flush()
    expect(client.snapshot()).toMatchObject({ busy: true, pending: true, blocking: false })
    requests[0].resolve(ok(1)); await job
    expect(client.snapshot()).toMatchObject({ busy: false, pending: false, blocking: false })
  })

  it('queues a player action behind refresh, waits for acknowledgement and locks only player work', async () => {
    const refresh = client.send({ type: 'refresh' }); await flush()
    let complete = false
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' }).then(() => { complete = true })
    await Promise.resolve()
    expect(complete).toBe(false)
    expect(requests).toHaveLength(1)
    expect(client.snapshot().blocking).toBe(true)
    requests[0].resolve(ok(1))
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(complete).toBe(false)
    expect(requests[1].body.command.type).toBe('care')
    requests[1].resolve(ok(2)); await Promise.all([refresh, action])
    expect(complete).toBe(true)
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: false, busy: false })
    expect(JSON.parse(storage.get('pocket-friends-cloud-pending')!)).toEqual([])
  })

  it('retries failed background work with the same operation before a player action', async () => {
    const refresh = client.send({ type: 'refresh' }); await flush()
    const operation = requests[0].body.operation
    requests[0].resolve(Response.json({ error: '일시적인 연결 오류' }, { status: 503 })); await refresh
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: true })
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' })
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1].body.operation).toBe(operation)
    expect(client.snapshot().blocking).toBe(true)
    requests[1].resolve(ok(1))
    await vi.waitFor(() => expect(requests).toHaveLength(3))
    requests[2].resolve(ok(2)); await action
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: false, error: '' })
  })

  it('keeps failed player actions locked and durable until the same operation is retried', async () => {
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' }); await flush()
    const operation = requests[0].body.operation
    requests[0].resolve(Response.json({ error: '일시적인 연결 오류' }, { status: 503 })); await action
    expect(client.snapshot()).toMatchObject({ busy: false, blocking: true, pending: true })
    const retry = client.retry()
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1].body.operation).toBe(operation)
    requests[1].resolve(ok(1)); await retry
    expect(client.snapshot().blocking).toBe(false)
  })
  it('coalesces overlapping reads and reuses an unchanged revision without changing row identity', async () => {
    const first=client.read(), second=client.read();await flush();expect(requests).toHaveLength(1)
    requests[0].resolve(ok(4));await Promise.all([first,second]);const row=client.snapshot().row
    const next=client.read();await vi.waitFor(()=>expect(requests).toHaveLength(2))
    expect(requests[1].body.knownRevision).toBe(4)
    requests[1].resolve(Response.json({unchanged:true,revision:4,serverTime:1100}));await next
    expect(client.snapshot().row).toBe(row)
  })

  it('applies a command delta and recovers a missing base with one full read without repeating the command',async()=>{
    const before={id:'home',revision:4,updated_at:'before',data:freshWorld(1000)},next=structuredClone(before);next.revision=5;next.data.world!.coins++
    const read=client.read();await flush();requests[0].resolve(Response.json({row:before}));await read
    const job=client.send({type:'refresh'});await vi.waitFor(()=>expect(requests).toHaveLength(2))
    requests[1].resolve(Response.json({...worldPayload(next,before),serverTime:1200}));await job
    expect(client.snapshot().row).toEqual(next)
    const delta=worldPayload({...next,revision:8}, {...next,revision:7})
    const action=client.send({type:'care',friendId:'momo',action:'pet'});await vi.waitFor(()=>expect(requests).toHaveLength(3))
    requests[2].resolve(Response.json(delta));await vi.waitFor(()=>expect(requests).toHaveLength(4))
    expect(requests[3].body).toMatchObject({action:'status',full:true});expect(requests[3].body.knownRevision).toBeUndefined()
    requests[3].resolve(Response.json({row:{...next,revision:8}}));await action
    expect(client.snapshot().row!.revision).toBe(8)
    expect(requests.filter(r=>r.body.action==='command')).toHaveLength(2)
    expect(client.snapshot().pending).toBe(false)
  })

  it('deduplicates queued refresh operations without losing user actions',async()=>{
    const first=client.send({type:'refresh'});await flush();const second=client.send({type:'refresh'})
    expect(JSON.parse(storage.get('pocket-friends-cloud-pending')!)).toHaveLength(1)
    requests[0].resolve(ok(1));await Promise.all([first,second]);expect(requests).toHaveLength(1)
  })

  it('does not let an older response delta roll back a newer synchronized row',async()=>{
    const before={id:'home',revision:4,updated_at:'before',data:freshWorld(1000)},next={...before,revision:5}
    const read=client.read();await flush();requests[0].resolve(Response.json({row:before}));await read
    const stale=client.read();await vi.waitFor(()=>expect(requests).toHaveLength(2))
    const command=client.send({type:'refresh'});await vi.waitFor(()=>expect(requests).toHaveLength(3))
    requests[2].resolve(Response.json({row:{...before,revision:6}}));await command
    requests[1].resolve(Response.json(worldPayload(next,before)));await stale
    expect(client.snapshot().row!.revision).toBe(6);expect(requests).toHaveLength(3)
  })

  it('pauses polling while hidden/offline, resumes once online, and creates no full-row Realtime subscription',async()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']})
    const doc=Object.assign(new EventTarget(),{hidden:false}),win=new EventTarget(),nav={onLine:true}
    vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',nav)
    let calls=0;vi.stubGlobal('fetch',vi.fn(async()=>{calls++;return calls===1?ok(1):Response.json({unchanged:true,revision:1})}))
    try {
      await client.start();expect(calls).toBe(1)
      doc.hidden=true;await vi.advanceTimersByTimeAsync(60000);expect(calls).toBe(1)
      doc.hidden=false;nav.onLine=false;await vi.advanceTimersByTimeAsync(30000);expect(calls).toBe(1)
      nav.onLine=true;win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);expect(calls).toBe(2)
      client.dispose();await vi.advanceTimersByTimeAsync(30000);expect(calls).toBe(2)
    } finally {client.dispose();vi.useRealTimers()}
  })

  it('backs off failed probes and avoids periodic reads while a player command is pending',async()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']})
    vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false}));vi.stubGlobal('window',new EventTarget());vi.stubGlobal('navigator',{onLine:true})
    let calls=0;vi.stubGlobal('fetch',vi.fn(async()=>++calls===1?ok(1):Response.json({error:'일시적인 오류'},{status:503})))
    try {
      await client.start();await vi.advanceTimersByTimeAsync(20000);expect(calls).toBe(4)
      await vi.advanceTimersByTimeAsync(15000);expect(calls).toBe(4)
      await client.send({type:'care',friendId:'momo',action:'pet'});const n=calls
      await vi.advanceTimersByTimeAsync(120000);expect(calls).toBe(n);expect(client.snapshot().pending).toBe(true)
    } finally {client.dispose();vi.useRealTimers()}
  })

  it('stops automatic probe retries after five failures until an explicit retry or reconnect',async()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']})
    vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false}));vi.stubGlobal('window',new EventTarget());vi.stubGlobal('navigator',{onLine:true})
    let calls=0;vi.stubGlobal('fetch',vi.fn(async()=>++calls===1?ok(1):Response.json({error:'일시적인 오류'},{status:503})))
    try {
      await client.start();await vi.advanceTimersByTimeAsync(600000);expect(calls).toBe(6)
      await client.read();expect(calls).toBe(7)
    } finally {client.dispose();vi.useRealTimers()}
  })

})
